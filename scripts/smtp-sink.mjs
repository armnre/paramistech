// Minimal local SMTP catcher for verifying notifications. Not for production.
// Usage: SMTP_SINK_PORT=2525 SMTP_SINK_FILE=/tmp/mail-sink.log node scripts/smtp-sink.mjs
import { appendFileSync } from 'node:fs';
import net from 'node:net';

const port = Number(process.env.SMTP_SINK_PORT || 2525);
const file = process.env.SMTP_SINK_FILE || '/tmp/mail-sink.log';

function decode(raw) {
  // Subject may be folded into several RFC 2047 encoded words.
  const header = raw.match(/^Subject:([^\r\n]*(?:\r\n[ \t][^\r\n]*)*)/im);
  const subject = header
    ? [...header[1].matchAll(/=\?UTF-8\?B\?([^?]+)\?=/gi)].map((match) => Buffer.from(match[1], 'base64').toString('utf8')).join('')
    : '(none)';
  const bodies = [...raw.matchAll(/Content-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)(?:\r\n--|$)/g)].map((match) =>
    Buffer.from(match[1].replace(/\s+/g, ''), 'base64').toString('utf8'),
  );
  return [`SUBJECT: ${subject}`, ...bodies].join('\n---\n');
}

net
  .createServer((socket) => {
    let buffer = '';
    let message = '';
    let inData = false;
    const recipients = [];
    socket.write('220 sink ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index;
      while ((index = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            appendFileSync(file, `=== MAIL to ${recipients.join(',')} ===\n${decode(message)}\n\n`);
            message = '';
            socket.write('250 queued\r\n');
          } else {
            message += `${line.startsWith('..') ? line.slice(1) : line}\r\n`;
          }
          continue;
        }
        const command = line.slice(0, 4).toUpperCase();
        if (command === 'EHLO' || command === 'HELO') socket.write('250 sink\r\n');
        else if (command === 'MAIL') socket.write('250 OK\r\n');
        else if (command === 'RCPT') {
          recipients.push(line.replace(/^RCPT TO:\s*<?|>?\s*$/gi, ''));
          socket.write('250 OK\r\n');
        } else if (command === 'DATA') {
          inData = true;
          socket.write('354 end with <CRLF>.<CRLF>\r\n');
        } else if (command === 'QUIT') socket.end('221 bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
    socket.on('error', () => {});
  })
  .listen(port, '127.0.0.1', () => console.log(`SMTP sink listening on 127.0.0.1:${port}, writing to ${file}`));
