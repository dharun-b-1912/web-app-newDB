// patch_finally.cjs - adds finally block to syncLivePunchesFromGateway
const fs = require('fs');
const file = 'src/services/attendance/biometricGatewayService.ts';
let src = fs.readFileSync(file, 'utf8');

const OLD = `      return true;
    } catch {
      return false;
    }
  }

  getDeviceUserHistory`;

const NEW = `      return true;
    } catch {
      return false;
    } finally {
      this._syncPunchesInFlight = false;
    }
  }

  getDeviceUserHistory`;

if (src.includes(OLD.replace(/\n/g, '\r\n'))) {
  src = src.replace(OLD.replace(/\n/g, '\r\n'), NEW.replace(/\n/g, '\r\n'));
  fs.writeFileSync(file, src, 'utf8');
  console.log('Patched CRLF version OK');
} else if (src.includes(OLD)) {
  src = src.replace(OLD, NEW);
  fs.writeFileSync(file, src, 'utf8');
  console.log('Patched LF version OK');
} else {
  console.log('Pattern not found — showing context:');
  const idx = src.indexOf('return true;\n    } catch');
  const idx2 = src.indexOf('return true;\r\n    } catch');
  console.log('LF idx:', idx, 'CRLF idx:', idx2);
  console.log(JSON.stringify(src.slice(Math.max(0, (idx2 > -1 ? idx2 : idx) - 10), (idx2 > -1 ? idx2 : idx) + 120)));
}
