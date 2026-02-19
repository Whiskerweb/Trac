const fs = require('fs');

// Read the potrace SVG
const svg = fs.readFileSync('public/Logotrac/logo_final.svg', 'utf-8');

// Extract path d attributes
const pathRegex = /\<path d="([^"]+)"/g;
let match;
const paths = [];
while ((match = pathRegex.exec(svg)) !== null) {
    paths.push(match[1]);
}

console.log('Found', paths.length, 'paths\n');

// Parse potrace relative coordinates
// Potrace uses relative movements with implicit coordinates
// Actually potrace outputs absolute coordinates in its own coord system

// The transform is: translate(0,10000) scale(0.1,-0.1)
// This means: displayed_x = path_x * 0.1
//             displayed_y = 10000*0.1 - path_y * 0.1 = 1000 - path_y * 0.1
// But the viewBox is "0 0 1000 1000" in pt
// To get 0-100: divide displayed coords by 10
// So: x_100 = path_x * 0.01
//     y_100 = 100 - path_y * 0.01

function convertCoord(pathX, pathY) {
    return [
        Math.round(pathX * 0.01 * 10) / 10,
        Math.round((100 - pathY * 0.01) * 10) / 10
    ];
}

// Parse the SVG path data
function parseSVGPath(d) {
    // Clean up multiline
    d = d.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    const commands = [];
    let current = '';

    // Split into commands
    const tokens = d.match(/[MLCZHVmlchvz]|[-+]?[0-9]*\.?[0-9]+/g);

    let cmd = '';
    let nums = [];
    let i = 0;

    while (i < tokens.length) {
        const token = tokens[i];
        if (/[MLCZHVmlchvz]/.test(token)) {
            if (cmd && nums.length > 0) {
                commands.push({ cmd, nums: [...nums] });
            }
            cmd = token;
            nums = [];
        } else {
            nums.push(parseFloat(token));
        }
        i++;
    }
    if (cmd) {
        commands.push({ cmd, nums: [...nums] });
    }

    return commands;
}

function convertPath(d) {
    const commands = parseSVGPath(d);
    let result = [];
    let cx = 0, cy = 0; // current position in potrace coords

    for (const { cmd, nums } of commands) {
        switch (cmd) {
            case 'M': {
                cx = nums[0]; cy = nums[1];
                const [x, y] = convertCoord(cx, cy);
                result.push(`M ${x} ${y}`);
                break;
            }
            case 'm': {
                cx += nums[0]; cy += nums[1];
                const [x, y] = convertCoord(cx, cy);
                result.push(`M ${x} ${y}`);
                break;
            }
            case 'l': {
                // Relative line - may have multiple pairs
                for (let j = 0; j < nums.length; j += 2) {
                    cx += nums[j]; cy += nums[j + 1];
                    const [x, y] = convertCoord(cx, cy);
                    result.push(`L ${x} ${y}`);
                }
                break;
            }
            case 'L': {
                for (let j = 0; j < nums.length; j += 2) {
                    cx = nums[j]; cy = nums[j + 1];
                    const [x, y] = convertCoord(cx, cy);
                    result.push(`L ${x} ${y}`);
                }
                break;
            }
            case 'c': {
                // Relative cubic bezier
                for (let j = 0; j < nums.length; j += 6) {
                    const [x1, y1] = convertCoord(cx + nums[j], cy + nums[j + 1]);
                    const [x2, y2] = convertCoord(cx + nums[j + 2], cy + nums[j + 3]);
                    cx += nums[j + 4]; cy += nums[j + 5];
                    const [x, y] = convertCoord(cx, cy);
                    result.push(`C ${x1} ${y1} ${x2} ${y2} ${x} ${y}`);
                }
                break;
            }
            case 'C': {
                for (let j = 0; j < nums.length; j += 6) {
                    const [x1, y1] = convertCoord(nums[j], nums[j + 1]);
                    const [x2, y2] = convertCoord(nums[j + 2], nums[j + 3]);
                    cx = nums[j + 4]; cy = nums[j + 5];
                    const [x, y] = convertCoord(cx, cy);
                    result.push(`C ${x1} ${y1} ${x2} ${y2} ${x} ${y}`);
                }
                break;
            }
            case 'z':
            case 'Z':
                result.push('Z');
                break;
            default:
                console.log('Unknown command:', cmd, nums);
        }
    }

    return result.join(' ');
}

paths.forEach((d, i) => {
    console.log(`=== Path ${i + 1} ===`);
    const converted = convertPath(d);
    console.log(converted);
    console.log();
});
