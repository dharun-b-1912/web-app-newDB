import { Employee } from '../types';

export interface MonthlyTrajectoryPoint {
  month: string;
  ym: string;
  opening: number;
  hires: number;
  transfers: number;
  exits: number;
  closing: number;
}

export interface WorkforceMovementMetrics {
  newHiresCount: number;
  exitsCount: number;
  noticeCount: number;
  transfersCount: number;
  netMovement: number;
  trajectory: MonthlyTrajectoryPoint[];
}

export const workforceMovementEngine = {
  // Compute monthly scale trajectory
  getMonthlyTrajectory(employees: Employee[], monthsCount = 12): MonthlyTrajectoryPoint[] {
    const points: MonthlyTrajectoryPoint[] = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });

      // Joiners whose DOJ starts with this year-month
      const hires = employees.filter((e) => {
        const doj = e.employment?.doj || e.created_at;
        return doj && doj.startsWith(ym);
      }).length;

      // Exits recorded
      const exits = employees.filter((e) => {
        const isExit = e.status === 'Exited' || e.status === 'Terminated' || e.status === 'Resigned';
        const exitDate = e.updated_at;
        return isExit && exitDate && exitDate.startsWith(ym);
      }).length;

      // Closing headcount up to this month
      const closing = employees.filter((e) => {
        const doj = e.employment?.doj || e.created_at;
        return doj ? doj.slice(0, 7) <= ym : true;
      }).length;

      const opening = Math.max(0, closing - hires + exits);

      points.push({
        month: monthLabel,
        ym,
        opening,
        hires,
        transfers: 0,
        exits,
        closing,
      });
    }

    return points;
  },

  // Authoritative movement metrics for current period
  getMovementMetrics(employees: Employee[], periodYm?: string): WorkforceMovementMetrics {
    const now = new Date();
    const currentYm = periodYm || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const newHires = employees.filter((e) => {
      const doj = e.employment?.doj || e.created_at;
      return doj && doj.startsWith(currentYm);
    }).length;

    const noticeEmployees = employees.filter((e) => e.status === 'Notice Period');
    const exitedEmployees = employees.filter((e) => e.status === 'Exited' || e.status === 'Terminated' || e.status === 'Resigned');

    const totalExits = noticeEmployees.length + exitedEmployees.length;
    const trajectory = this.getMonthlyTrajectory(employees, 12);

    return {
      newHiresCount: newHires,
      exitsCount: totalExits,
      noticeCount: noticeEmployees.length,
      transfersCount: 0,
      netMovement: newHires - totalExits,
      trajectory,
    };
  },
};
