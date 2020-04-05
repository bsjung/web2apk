let fs = require('fs');

module.exports = fs.existsSync || function existsSync(filePath) {
        try {
            fs.statSync(filePath);
        } catch (err) {
            if (err.code == 'ENOENT') return false;
        }
        return true;
    };

/**
 * Convert a relative url to absolute based on given base url
 *
 * /some/path (base: example.com) => example.com/some/path
 * /some/path (base: example.com/other) => example.com/some/path
 * /some/path (base: example.com/other?q=1) => example.com/some/path
 *
 * @param base
 * @param relative
 * @return {string}
 */
function relativeToAbsolute(base, relative) {
    //make sure base ends with /
    if (base[base.length - 1] != '/')
        base += '/';

    //base: https://server/relative/subfolder/
    //url: https://server
    let url = base.substr(0, base.indexOf('/', base.indexOf('//') + 2));
    //baseServerRelative: /relative/subfolder/
    let baseServerRelative = base.substr(base.indexOf('/', base.indexOf('//') + 2));
    if (relative.indexOf('/') === 0)//relative is server relative
        url += relative;
    else if (relative.indexOf("://") > 0)//relative is a full url, ignore base.
        url = relative;
    else {
        while (relative.indexOf('../') === 0) {
            //remove ../ from relative
            relative = relative.substring(3);
            //remove one part from baseServerRelative. /relative/subfolder/ -> /relative/
            if (baseServerRelative !== '/') {
                let lastPartIndex = baseServerRelative.lastIndexOf('/', baseServerRelative.length - 2);
                baseServerRelative = baseServerRelative.substring(0, lastPartIndex + 1);
            }
        }
        url += baseServerRelative + relative;//relative is a relative to base.
    }

    return url;
}

/**
 * Extract some helpful information about the page for given url
 *
 * @param url
 * @return {Promise.<TResult>}
 */
const getPageInfo = (url) => {
    const fetch = require('node-fetch');

    return fetch(url)
        .then(response => {
            url = response.url;
            //console.log ("[DEBUG] getPageInfo url ", url);
            return response.text();
        })
        .then((html) => {
            const cheerio = require('cheerio');
            const $ = cheerio.load(html);

            let icon, title, description = null;

            //resolve title
            if ($('title').length) {
                title = $('title').text()
            }

            //resolve app description
            if ($('meta[name="description"]').length) {
                description = $('meta[name="description"]').text();
            }

            //resolve app icon
            $('meta[itemprop*="image"]').each((i, elem) => {
                icon = $(elem).attr('content');
            });

            if (!icon) {
                $('link[rel="apple-touch-icon"]').each((i, elem) => {
                    icon = $(elem).attr('href');
                });
            }

            if (icon) {
                icon = icon.replace("https", "http");
                //console.log ("[DEBUG] getPageInfo icon ", icon);
                icon = relativeToAbsolute(url, icon);
            }

            return data = {
                title: title,
                description: description,
                app_icon: icon,
            };
        });
};

function extend(target) {
    let sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (let prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

function download(uri, filename, callback) {
    let request = require('request'), fs = require('fs');
    request.head(uri, function (err, res, body) {

        let stream = fs.createWriteStream(filename);

        request(uri)
            .on('error', () => {
                stream.close();
            })
            .pipe(stream)
            .on('close', callback);
    });

}

module.exports = {relativeToAbsolute, getPageInfo, extend, download};
