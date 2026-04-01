import fs from 'fs';

const filePath = 'app/(dashboard)/dashboard/pdv/page.tsx';
let lines = fs.readFileSync(filePath, 'utf-8').split('\n');

// Find line 701 (0-indexed: 700) which is )}\n and needs 2 more closing divs
// Lines 700: "                            )}"
// We need to insert:
//   "                        </div>"   (closes the mt-2 pt-2 div from line 627)
//   "                    </div>"       (closes the flex flex-col div from line 605)

// Find the exact line
let fixLine = -1;
for (let i = 695; i < 710; i++) {
    if (lines[i] && lines[i].trim() === ')}' && lines[i+1] && lines[i+1].trim().startsWith('</div>')) {
        // This is the closing )} of the split section at line ~701
        fixLine = i;
        break;
    }
}

if (fixLine === -1) {
    // try another heuristic
    for (let i = 695; i < 710; i++) {
        console.log(`Line ${i+1}: "${lines[i]}"`);
    }
    process.exit(1);
}

console.log(`Fixing after line ${fixLine+1}: "${lines[fixLine]}"`);
console.log(`Next line ${fixLine+2}: "${lines[fixLine+1]}"`);

// Insert the two closing divs after the )}
lines.splice(fixLine + 1, 0, 
    '                        </div>',   // closes Mobile Payment Area div
    '                    </div>'        // closes flex flex-col div
);

fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
console.log('Fixed! Added 2 closing divs at line', fixLine+2);
