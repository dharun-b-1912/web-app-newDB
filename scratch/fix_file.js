import fs from 'fs';

const filePath = 'd:/Joy Corporate Solutions/JOY PeopleHR/web-app/Joy PeopleHR new version/workforceos-enterprise-hrms/flutter_app/lib/features/employee/home/screens/employee_home_screen.dart';

let content = fs.readFileSync(filePath, 'utf8');

const badChunk = `                                Text(
                                  locationResult.targetLocation?.name ??
                                      (currentUser.approvedLocation.name.isNotEmpty
                                          ? currentUser.approvedLocation.name
                                          : (currentUser.campus.isNotEmpty
                                              ? currentUser.campus
                                              : 'Assigned Work Location')),
                                              : (currentUser.assignedLocations.isNotEmpty
                                                  ? currentUser.assignedLocations.first.name
                                                  : 'No work location assigned'))),`;

const goodChunk = `                                Text(
                                  locationResult.targetLocation?.name ??
                                      (currentUser.approvedLocation.name.isNotEmpty
                                          ? currentUser.approvedLocation.name
                                          : (currentUser.campus.isNotEmpty
                                              ? currentUser.campus
                                              : (currentUser.assignedLocations.isNotEmpty
                                                  ? currentUser.assignedLocations.first.name
                                                  : 'No work location assigned'))),`;

if (content.includes(badChunk)) {
  content = content.replace(badChunk, goodChunk);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed using exact string match!');
} else {
  // Try regex replace
  const regex = /Text\(\s*locationResult\.targetLocation\?\.name\s*\?\?[\s\S]*?'No work location assigned'\)\)\),/m;
  if (regex.test(content)) {
    content = content.replace(regex, `Text(
                                  locationResult.targetLocation?.name ??
                                      (currentUser.approvedLocation.name.isNotEmpty
                                          ? currentUser.approvedLocation.name
                                          : (currentUser.campus.isNotEmpty
                                              ? currentUser.campus
                                              : (currentUser.assignedLocations.isNotEmpty
                                                  ? currentUser.assignedLocations.first.name
                                                  : 'No work location assigned'))),`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed using regex match!');
  } else {
    console.log('Could not find chunk with regex or exact match');
  }
}
