﻿(function () {

    function setImageIntoElement(elem, url) {

        if (elem.tagName === "DIV") {

            elem.style.backgroundImage = "url('" + url + "')";

        } else {
            elem.setAttribute("src", url);
        }
    }

    var fileSystem;
    function getFileSystem() {

        var deferred = DeferredBuilder.Deferred();

        if (fileSystem) {
            deferred.resolveWith(null, [fileSystem]);
        } else {
            requestFileSystem(PERSISTENT, 0, function (fs) {
                fileSystem = fs;
                deferred.resolveWith(null, [fileSystem]);
            });
        }

        return deferred.promise();
    }

    function indexedDbBlobImageStore() {

        var self = this;

        function getCacheKey(url) {

            // Try to strip off the domain to share the cache between local and remote connections
            var index = url.indexOf('://');

            if (index != -1) {
                url = url.substring(index + 3);

                index = url.indexOf('/');

                if (index != -1) {
                    url = url.substring(index + 1);
                }

            }

            return CryptoJS.MD5(url).toString();
        }

        self.getImageUrl = function (originalUrl) {

            if ($.browser.android && originalUrl.indexOf('tag=') != -1) {
                originalUrl += "&format=webp";
            }

            var deferred = DeferredBuilder.Deferred();
            var key = getCacheKey(originalUrl);

            console.log('getImageUrl:' + originalUrl);

            getFileSystem().done(function (fileSystem) {
                var path = fileSystem.root.toURL() + "/emby/cache/" + key;

                resolveLocalFileSystemURL(path, function (fileEntry) {
                    var localUrl = fileEntry.toURL();
                    console.log('returning cached file: ' + localUrl);
                    console.log(localUrl);
                    deferred.resolveWith(null, [localUrl]);

                }, function () {

                    console.log('downloading: ' + originalUrl);
                    var ft = new FileTransfer();
                    ft.download(originalUrl, path, function (entry) {

                        var localUrl = entry.toURL();

                        console.log(localUrl);
                        deferred.resolveWith(null, [localUrl]);
                    });
                });
            });

            return deferred.promise();
        };

        self.setImageInto = function (elem, url) {

            function onFail() {
                setImageIntoElement(elem, url);
            }

            self.getImageUrl(url).done(function (localUrl) {

                setImageIntoElement(elem, localUrl);

            }).fail(onFail);
        };

        window.ImageStore = self;
    }

    new indexedDbBlobImageStore();

})();