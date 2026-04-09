const fs = require('fs');
const path = require('path');

const srcPagesDir = path.join(__dirname, 'frontend', 'src', 'pages');

function crawlAndRemoveTopbar(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            crawlAndRemoveTopbar(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Regex to match <div className="topbar"> ... </div>
            // Assuming it doesn't contain nested topbars, we can match until the next </div> that matches the indentation or just match the known block
            // It's safer to replace a known pattern
            const regex = /<div className="topbar">[\s\S]*?(?:<\/button>\s*<\/div>\s*<\/div>|<\/div>\s*<\/div>\s*<\/div>| Logout\s*<\/button>\s*<\/div>\s*<\/div>)/g;
            let newContent = content.replace(regex, '');
            // Some topbars might have different structures depending on the buttons inside.
            // A better way is using a stack to find the matching closing tag.
            let idx = newContent.indexOf('<div className="topbar">');
            while (idx !== -1) {
                let openCount = 1;
                let i = idx + 24;
                while (i < newContent.length && openCount > 0) {
                    if (newContent.substring(i, i + 4) === '<div') openCount++;
                    else if (newContent.substring(i, i + 5) === '</div') openCount--;
                    i++;
                }
                // i is now at the character after the > of the closing wait, i-1 is 'v' or '>', to be exact, let's just find the closing bracket
                while(i < newContent.length && newContent[i-1] !== '>') { i++; }
                newContent = newContent.substring(0, idx) + newContent.substring(i);
                idx = newContent.indexOf('<div className="topbar">');
            }
            if (content !== newContent) {
                console.log(`Cleaned ${fullPath}`);
                fs.writeFileSync(fullPath, newContent, 'utf8');
            }
        }
    });
}

crawlAndRemoveTopbar(srcPagesDir);
