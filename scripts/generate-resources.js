/**
 * Generates Bloomly resource guide pages from content/resources/guides.json
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const guidesPath = path.join(root, 'content', 'resources', 'guides.json');
const indexPath = path.join(root, 'resources', 'index.html');
const templatePath = path.join(root, 'resources', '_guide-template.html');

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildTakeawaysHtml(takeaways) {
    return takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n                        ');
}

function buildGuideCard(guide) {
    return `
                    <a class="resource-guide-card" href="/resources/${guide.slug}/" data-category="${guide.categorySlug}">
                        <span class="resource-guide-emoji" aria-hidden="true">${guide.emoji}</span>
                        <span class="resource-type-pill">${escapeHtml(guide.category)}</span>
                        <h3>${escapeHtml(guide.title)}</h3>
                        <p>${escapeHtml(guide.summary)}</p>
                        <span class="resource-guide-meta">${escapeHtml(guide.readTime)} read · Bloomly Guide</span>
                    </a>`;
}

function buildGuidePage(guide, template) {
    const canonical = `https://bloomly.co.ke/resources/${guide.slug}/`;
    return template
        .replace(/__TITLE__/g, escapeHtml(guide.title))
        .replace(/__SUMMARY__/g, escapeHtml(guide.summary))
        .replace(/__CATEGORY__/g, escapeHtml(guide.category))
        .replace(/__READ_TIME__/g, escapeHtml(guide.readTime))
        .replace(/__CANONICAL__/g, canonical)
        .replace('__TAKEAWAYS__', buildTakeawaysHtml(guide.takeaways))
        .replace('__BODY__', guide.body);
}

function replaceBetweenMarkers(source, startMarker, endMarker, replacement) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker);
    if (start === -1 || end === -1 || end < start) {
        throw new Error(`Missing markers ${startMarker} / ${endMarker}`);
    }
    return `${source.slice(0, start + startMarker.length)}${replacement}${source.slice(end)}`;
}

function main() {
    const guides = JSON.parse(fs.readFileSync(guidesPath, 'utf8'));
    const template = fs.readFileSync(templatePath, 'utf8');

    guides.forEach((guide) => {
        const dir = path.join(root, 'resources', guide.slug);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), buildGuidePage(guide, template));
    });

    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    const cardsHtml = guides.map(buildGuideCard).join('');
    indexHtml = replaceBetweenMarkers(
        indexHtml,
        '<!-- bloomly:resource-guides:start -->',
        '<!-- bloomly:resource-guides:end -->',
        cardsHtml
    );
    fs.writeFileSync(indexPath, indexHtml);

    console.log(`✅ Generated ${guides.length} Bloomly resource guide(s)`);
}

main();
