const client = require('cheerio-httpcli');

/**
 * データの取得.
 *
 * @param {string} query - 検索キーワード.
 * @return {Array} 検索結果.
 */
const fetchData = async (query) => {
    const url = new URL(`https://www.mercari.com/jp/search/?keyword=${query}`);
    const fetchResult = await client.fetch(url.toString());

    const { $ } = fetchResult;

    // 各アイテムに対する処理.
    const results = Array.from($('.items-box')).map((itemBox) => {
        const $itemBox = $(itemBox);
        const href = $itemBox.find('a').attr('href');
        return {
            name: $itemBox.find('.items-box-name').text(),
            price: $itemBox.find('.items-box-price').text(),
            image: $itemBox.find('.items-box-photo img').attr('src'),
            url: new URL(href, url),
            href,
            soldOut: ($itemBox.find('.item-sold-out-badge').length !== 0),
        };
    });

    return results;
};

/**
 * @module
 */
module.exports = function(RED) {
    function MercariSearch(config) {
        RED.nodes.createNode(this, config);
        const thisNode = this;
        thisNode.on('input', function (message, send, done) {
            (async (msg) => {
                // ----------------------------------------

                // v0.x系ではsendは存在しないので、その場合はthisNode.sendを適用する.
                send = send || function() { thisNode.send.apply(thisNode, arguments); }

                // メインの処理(データ取得)
                const fetchedData = await fetchData(msg.payload);
                msg.payload = fetchedData;

                // 後続のノードへデータを送信する.
                send(msg);

                // 目的となる処理が終わったらdoneを呼び出します。
                // v1.0未満の場合はdoneは未定義のため、doneがあれば呼び出すというような処理にします。
                if (done) {
                    done();
                }

                // ----------------------------------------
            })(message).catch((err) => {
                if (done) {
                    // v1.0以降はdoneのパラメーターにエラーの内容を渡します.
                    done(err);
                } else {
                    // v0.x系での従来通りの呼び出し方法.
                    thisNode.error(err, message);
                }
            });
        });
    }
    RED.nodes.registerType('mercari-search', MercariSearch);
};
