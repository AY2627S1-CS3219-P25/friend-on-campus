import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

// Run from any directory: node docs/architecture/cloud-architecture.mjs
const parts = [];
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function text(x, y, value, cls = 'label') {
  parts.push(`<text x="${x}" y="${y}" class="${cls}">${escape(value)}</text>`);
}
function group(x, y, width, height, label, color) {
  parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="none" stroke="${color}" stroke-width="1.2"/>`);
  text(x + width / 2, y + 21, label, 'group');
}
function node(x, y, icon, title, lines = []) {
  if (icon) {
    const asset = readFileSync(new URL(`./aws-icons/${icon}.svg`, import.meta.url));
    parts.push(`<defs><clipPath id="icon-${x}-${y}"><rect x="${x - 25}" y="${y - 25}" width="50" height="50" rx="9"/></clipPath></defs>`);
    parts.push(`<image x="${x - 25}" y="${y - 25}" width="50" height="50" clip-path="url(#icon-${x}-${y})" href="data:image/svg+xml;base64,${asset.toString('base64')}"/>`);
  } else {
    parts.push(`<rect x="${x - 25}" y="${y - 25}" width="50" height="50" rx="9" fill="#64748b"/><path d="M${x - 14} ${y - 10}h28v19h-28z M${x} ${y + 9}v7 M${x - 8} ${y + 16}h16" fill="none" stroke="white" stroke-width="1.5"/>`);
  }
  text(x, y + 46, title);
  lines.forEach((line, index) => text(x, y + 65 + index * 18, line, 'small'));
}
function arrow(points, label, x, y, both = false) {
  assert(points.length >= 2 && points.every((point) => point.length === 2 && point.every(Number.isFinite)));
  parts.push(`<polyline points="${points.map((point) => point.join(',')).join(' ')}" fill="none" stroke="#555" stroke-width="1.15" stroke-linejoin="round" marker-end="url(#arrow)"${both ? ' marker-start="url(#arrow)"' : ''}/>`);
  if (label) text(x, y, label, 'edge');
}

group(330, 65, 920, 665, 'VPC · ap-southeast-1', '#ed8a23');
group(530, 120, 690, 480, 'ECS ON EC2 · 3 HOSTS · ONE PUBLIC SUBNET / AZ', '#a970ff');
group(350, 430, 140, 160, 'PRIVATE DB SUBNETS', '#527fff');

// Draw connections first so icons and labels remain legible at connection endpoints.
arrow([[65, 300], [155, 300]]);
arrow([[205, 300], [365, 300]], 'HTTP / WS', 282, 286);
arrow([[415, 300], [565, 300]]);
arrow([[615, 300], [710, 300], [710, 210], [795, 210]]);
arrow([[615, 300], [1045, 300]]);
arrow([[1070, 392], [1070, 410], [340, 410], [340, 495], [395, 495]], 'SQL', 742, 401);
arrow([[445, 495], [615, 495]], 'Outbox CDC', 534, 482);
arrow([[665, 495], [855, 495]], 'AMQP', 760, 482);
arrow([[880, 470], [880, 440], [1160, 440], [1160, 310], [1095, 310]], '', 0, 0, true);
arrow([[640, 568], [640, 635]]);
arrow([[880, 568], [880, 635]]);

node(40, 300, null, 'Browsers');
node(180, 300, 'cloudfront', 'CloudFront', ['HTTPS / WSS']);
node(390, 300, 'elastic-load-balancing', 'Public ALB', ['2 public subnets']);
node(590, 300, 'ecs', 'NGINX gateway');
node(820, 210, 'ecs', 'Frontends', ['Student app · Admin portal']);
node(1070, 300, 'ecs', 'Backend services', ['User · Supplier · Order', 'Credit · Notification · Chat']);
node(420, 495, 'rds', 'RDS PostgreSQL', ['6 DBs · Multi-AZ']);
node(640, 495, 'ecs', 'Debezium × 3', ['User · Order · Credit']);
node(880, 495, 'ecs', 'RabbitMQ × 3', ['Via private NLB']);
node(640, 660, 'efs', 'EFS One Zone');
node(880, 660, 'ebs', 'EBS broker disks');

text(170, 420, 'SUPPORTING SERVICES', 'group');
node(95, 470, 'ecr', 'ECR');
node(245, 470, 'secrets-manager', 'Secrets Manager');
node(95, 575, 'cloudwatch', 'CloudWatch Logs');
node(245, 575, 'route-53', 'Route 53 private DNS');
node(170, 680, null, 'NUS SoCLaaS');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="710" viewBox="0 45 1280 710" role="img" aria-labelledby="title description">
<title id="title">Friend on Campus AWS architecture</title>
<desc id="description">Browsers reach CloudFront, a public ALB and the NGINX gateway. ECS on three EC2 hosts runs two frontends, six backends, RabbitMQ and Debezium. RDS stores six service databases. Debezium publishes outbox changes to RabbitMQ through a private NLB; backends publish and consume messages. EBS retains broker data and EFS retains connector checkpoints. Supporting services provide images, secrets, logs and private DNS; Order and Chat call external NUS SoCLaaS. This is a simplified configuration view, not a live AWS inventory.</desc>
<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7" fill="#555"/></marker></defs>
<style>
text { font-family: Arial, sans-serif; text-anchor: middle; fill: #222; }
.label { font-size: 13px; }
.small { font-size: 11px; fill: #555; }
.group { font-size: 10px; letter-spacing: .35px; }
.edge { font-size: 10px; fill: #555; }
</style>
<rect width="1280" height="755" fill="#fff"/>
${parts.join('\n')}
</svg>\n`;

// Keep icons embedded, coordinates valid and IDs unique for portable Markdown viewing.
const images = [...svg.matchAll(/<image\b[^>]*href="([^"]+)"/g)];
assert.equal(images.length, 14);
assert(images.every(([, uri]) => uri.startsWith('data:image/svg+xml;base64,') && Buffer.from(uri.split(',')[1], 'base64').toString().includes('<svg')));
assert(!svg.includes('undefined'));
const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length);
writeFileSync(new URL('./cloud-architecture.svg', import.meta.url), svg);
console.log('Generated cloud-architecture.svg');
