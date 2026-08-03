/**
 * Builds a valid, trimmed stylesheet for blog pages from styles.css.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'styles.css');
const outPath = path.join(root, 'public', 'blog-fast.css');

const ranges = [
    [1, 118],
    [120, 353],
    [1621, 1718],
    [1813, 2132],
    [2855, 3163],
    [7151, 7194],
    [7408, 7427],
    [7429, 7433],
    [7435, 7682],
    [9091, 9100],
];

const blogExtras = `
/* Blog page hero */
.page-hero-light {
    background: var(--gradient-soft);
    overflow: hidden;
}

.page-hero-content {
    position: relative;
    z-index: 1;
}

.page-hero-header h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    margin-bottom: var(--space-md);
}

.page-hero-header p {
    font-size: var(--text-lg);
    max-width: 42rem;
    margin: 0 auto;
}

.page-hero-actions {
    margin-top: var(--space-lg);
    display: flex;
    justify-content: center;
    gap: var(--space-md);
}

.page-hero-orb {
    position: absolute;
    border-radius: 50%;
    background: rgba(168, 216, 248, 0.22);
    pointer-events: none;
}

.page-hero-orb-one {
    width: 120px;
    height: 120px;
    top: 18%;
    right: 8%;
}

.page-hero-orb-two {
    width: 88px;
    height: 88px;
    bottom: 22%;
    left: 6%;
}

.blog-search-label {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    max-width: 760px;
    margin: 0 auto;
    padding: 0.95rem 1.1rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-full);
    background: var(--color-white);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.06);
}

.blog-search-label input {
    flex: 1;
    border: 0;
    outline: none;
    font: inherit;
    background: transparent;
    min-width: 0;
}

.author-title {
    color: var(--color-muted);
    font-weight: 600;
    margin-bottom: var(--space-sm);
}

body {
    animation: none;
}
`;

function main() {
    const lines = fs.readFileSync(sourcePath, 'utf8').split('\n');
    const chunks = ranges.map(([start, end]) => lines.slice(start - 1, end).join('\n'));
    let css = `${chunks.join('\n\n')}\n${blogExtras}`;
    css = css
        .replace(
            /--font-primary:\s*'Inter',\s*'Poppins',\s*/g,
            '--font-primary: '
        )
        .replace(
            /--font-heading:\s*'Manrope',\s*'Nunito',\s*/g,
            '--font-heading: '
        );

    const open = (css.match(/\{/g) || []).length;
    const close = (css.match(/\}/g) || []).length;
    if (open !== close) {
        throw new Error(`CSS brace mismatch: ${open} open, ${close} close`);
    }

    fs.writeFileSync(outPath, css);
    console.log(`✅ Built ${outPath} (${Buffer.byteLength(css)} bytes)`);
}

main();
