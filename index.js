const http = require('http');
const https = require('https');
const PREFIX = "http://localhost:1337/qqq/";

// Create an HTTP tunneling proxy
const proxy = http.createServer((req, res) => {


    const url = req.url.split('qqq/')[1];
    if(!url || url.indexOf('://')===-1) return res.end('');

    const ht = url.indexOf('https://')===0 ? https : http;
    console.log(url);


    https.get(url, (resp) => {
        res.writeHead(200, resp.headers);
        let response = '';
        const html = resp.headers["content-type"]
            && resp.headers["content-type"].indexOf('text/html')===0;

        resp.on('data', (chunk) => {
            if(html) response+=`${chunk}`;
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
                const domain = url.split('/').slice(0, 3).join('/');
                const P = `${PREFIX}${domain}/`;
                response = response.replace(
                    /("|')(http.+?)("|')/gmi,
                    `$1${PREFIX}$2$3`
                );
                response = response.replace(
                     /(\<(a|img|base|meta|link|script).+?)((src|href|content)=("|')(?!\/\/)(\/(.*?))("|'))(.*?)\/?>/gmi,
                     `$1 $4="${P}$6" $9`
                );
                response = response.replace(
                    /("|')(?!\/\/)(\/(\S+?)\.(png|js|jpg|jpeg|html))("|')/gmi,
                    `$1${P}$3$5`
                );

                response = response.replace(
                    /:(\W?)url\(\/(.+?)\)/gmi,
                    `:url(${P}$2)`
                )
                let base = P.split('?')[0].split('/');
                base.pop();
                base = base.join('/');
                response = response.replace('</head>', `<base href="${base}/"/></head>`);

            }
            res.end(response);
        });
    });

});

// Now that proxy is running
proxy.listen(1337, '127.0.0.1', () => {

});
