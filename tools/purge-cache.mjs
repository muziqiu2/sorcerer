#!/usr/bin/env node
/* 刷新 EdgeOne 缓存（teo 2022-09-01）。
   用法：
     TC_SECRET_ID=xxx TC_SECRET_KEY=yyy node tools/purge-cache.mjs [zone] [url...]
   不带 url 时按站点默认清单刷新。 */
import crypto from 'node:crypto';

const SECRET_ID = process.env.TC_SECRET_ID;
const SECRET_KEY = process.env.TC_SECRET_KEY;
if (!SECRET_ID || !SECRET_KEY) {
  console.error('缺少 TC_SECRET_ID / TC_SECRET_KEY');
  process.exit(2);
}

const HOST = 'teo.tencentcloudapi.com';
const SERVICE = 'teo';
const VERSION = '2022-09-01';
const zoneName = process.argv[2] || 'sorcerer.top';
const base = `https://${zoneName}`;
const targets = process.argv.slice(3).length
  ? process.argv.slice(3)
  : [
      `${base}/`,
      `${base}/index.html`,
      `${base}/main.css`,
      `${base}/js/app.js`,
      `${base}/fonts/serif-400.woff2`,
      `${base}/fonts/serif-900.woff2`,
      `${base}/fonts/sixcaps-400.woff2`,
      `${base}/img/mark.svg`,
      `${base}/img/beian.png`,
    ];

const sha256hex = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const hmac = (key, s) => crypto.createHmac('sha256', key).update(s, 'utf8').digest();

async function call(action, payload = {}) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${HOST}\n`;
  const signedHeaders = 'content-type;host';
  const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, sha256hex(body)].join('\n');
  const scope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = ['TC3-HMAC-SHA256', timestamp, scope, sha256hex(canonicalRequest)].join('\n');
  const signature = crypto
    .createHmac('sha256', hmac(hmac(hmac('TC3' + SECRET_KEY, date), SERVICE), 'tc3_request'))
    .update(stringToSign, 'utf8')
    .digest('hex');
  const res = await fetch(`https://${HOST}/`, {
    method: 'POST',
    headers: {
      Authorization: `TC3-HMAC-SHA256 Credential=${SECRET_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'Content-Type': 'application/json; charset=utf-8',
      Host: HOST,
      'X-TC-Action': action,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': VERSION,
    },
    body,
  });
  const json = await res.json();
  if (json.Response?.Error) {
    const e = json.Response.Error;
    throw new Error(`${action}: ${e.Code} ${e.Message} (RequestId ${json.Response.RequestId})`);
  }
  return json.Response;
}

const zones = await call('DescribeZones', { Limit: 50 });
const zone = (zones.Zones || []).find((z) => z.ZoneName === zoneName);
if (!zone) throw new Error(`账号里没有 ${zoneName}，现有：${(zones.Zones || []).map((z) => z.ZoneName).join(', ') || '无'}`);

const r = await call('CreatePurgeTask', {
  ZoneId: zone.ZoneId,
  Type: 'purge_url',
  Method: 'invalidate',
  Targets: targets,
});
console.log(JSON.stringify({ zone: zoneName, zoneId: zone.ZoneId, jobId: r.JobId, failed: r.FailedList || [], targets: targets.length }, null, 2));
