const http = require('http');
const https = require('https');
const fs = require('fs');
const HOST = 'localhost:1337'
const PREFIX = `http://${HOST}/qqq/`;

const processTypes = [
    "text/html",
    "/javascript",
    "/css",
];

// Create an HTTP tunneling proxy
const proxy = http.createServer((req, res) => {


    let url = req.url.split('qqq/')[1];
    if(!url) {
        fs.readFile('./wrapper.html', (err,data) => res.end(data));
        return;
    }
    if(url.indexOf('//')===0) url = `https:${url}`;

    console.log(url);
    if(url.indexOf('://')===-1) url = `http://${url}`;

    const ht = url.indexOf('https://')===0 ? https : http;


    const outGoing = ht.get(url, (resp) => {

        let response = '';
        const shouldBeProcessed = resp.headers["content-type"]
            && processTypes.find(c => resp.headers["content-type"].indexOf(c)>=0);

        if(shouldBeProcessed) {
            delete resp.headers['content-length'];
        }

        const domain = url.split('/').slice(0, 3).join('/');
        const P = `${PREFIX}${domain}/`;

        if(resp.statusCode>=300 && resp.statusCode <400) {
            resp.headers['location'] = `${P}${resp.headers['location']}`;
        }
        res.writeHead(resp.statusCode, resp.headers);

        resp.on('data', (chunk) => {
            if(shouldBeProcessed) response+=`${chunk}`;
            else res.write(chunk);
        });
        resp.on('error', (err) => {
            console.log(err);
        });
        resp.on('end', () => {
            /*let SITE = req.url.split('/');
            SITE.pop();
            SITE = SITE.join('/');*/
            if(response) {
                response = response.replace(
                    /("|')(((http(s?):)?(\/\/)).+?)("|')/gmi,
                    `$1${PREFIX}$2$7`
                );
                response = response.replace(
                     /(\<(a|form|img|base|meta|link|script).*?) ((data-src|src|action|href|content)=("|')(?!\/\/)(\/(.*?))("|'))(.*?)(\/?>)/gmi,
                     `$1 $4="${P}$7" $9 $10`
                );
                response = response.replace(
                    / integrity=("|').+("|')?/gmi,
                    ''
                );
                response = response.replace(
                    /("|')(?!\/\/)(\/(\S+?)\.(png|js|jpg|jpeg|html))("|')/gmi,
                    `$1${P}$3$5`
                );

                response = response.replace(
                    /:(\W?)url\(\/(.+?)\)/gmi,
                    `:url(${P}$2)`
                )

                if(shouldBeProcessed==='/javascript') {

                }

                let base = P.split('?')[0].split('/');
                base.pop();
                base = base.join('/');
                response = response.replace('</head>', `<base href="${base}/"/></head>`);

                response = response.replace('</head>', `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval';"></head>`);

            }
            res.end(response);
        });
    });
    outGoing.on('error', console.error);
});

// Now that proxy is running
proxy.listen(1337, '0.0.0.0', () => {

});

process.on('uncaughtException', function(err) {
    console.log('### BIG ONE (%s)', err);
});
