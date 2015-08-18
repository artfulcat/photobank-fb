/**
 * Created by User on 15.08.2015.
 */

function Photobank(loginID, albumsID, photosID) {
    var loginResponse, loginStatus;
    var accessToken = '';

    var albums = [];

    var logined = $.Deferred();
    var downloaded = []; // of $.Deferred();

    //downloaded.done(function() { outputAlbumsList(); });

    //
    function makeFacebookPhotoURL( id ) {
        return 'https://graph.facebook.com/' + id + '/picture?access_token=' + accessToken;
    }

    //
    this.checkLoginStatus = function() {
        FB.getLoginStatus(function(response) {
            console.log(response);
            loginStatus = response.status;
            //
            if (response.status === 'connected') {
                // Logged into your app and Facebook.
                console.log('Welcome!  Fetching your information.... ');
                accessToken = response.authResponse.accessToken || '';
                //
                logined.resolve();
                //
                $(loginID).addClass("logined").text("Logout").addClass('btn-warning');

                //
                FB.api('/me', function(response) {
                    console.log('Successful login for: ' + response.name);
                    document.getElementById('status').innerHTML =
                        'Thanks for logging in, ' + response.name + '!';
                });
            } else {
                $(loginID).addClass('btn-success');
                if (response.status === 'not_authorized') {
                    // The person is logged into Facebook, but not your app.
                    document.getElementById('status').innerHTML = 'Please log ' +
                    'into this app.';
                } else {
                    // The person is not logged into Facebook, so we're not sure if
                    // they are logged into this app or not.
                    document.getElementById('status').innerHTML = 'Please log ' +
                    'into Facebook.';
                }
                //
                //this.login();
            }
        });
    }

    // разлогиниться
    this.logout = function() {
        FB.logout();
        logined = $.Deferred();
        $(loginID).toggleClass('logined').text("Login").toggleClass('btn-success btn-warning');
    }

    // залогиниться
    this.login = function() {
        FB.login(function(response) {
            if (response.authResponse) {
                console.log('Welcome!  Fetching your information.... ');
                loginResponse = response;
                    console.log(loginResponse);
                    alert(loginResponse.status);
                accessToken = loginResponse.authResponse.accessToken || '';
                //
                logined.resolve();
                $(loginID).toggleClass('logined').text("Logout").toggleClass('btn-success btn-warning');
            } else {
                console.log('User cancelled login or did not fully authorize.');
            }
        },{scope: 'user_photos'} ); //user_photos,public_profile,email
    }


    // получить список альбомов пользователя
    this.getAlbums = function() {
        // когда мы уже залогинимся, нужно запросить фотоальбомы
        logined.done( function() {
            FB.api(
                '/me/albums',
                //{fields: 'id,cover_photo'},
                function(albumResponse) {
                    if (albumResponse && !albumResponse.error) {
                        //console.log( ' got albums ' );
                        albums = albumResponse.data;//.slice(0);
                        console.log("albums:");
                        console.log(albums);
                        getPhotos();
                        console.log("albums with photos:");
                        console.log(albums);
                    } else {
                        alert("Ошибка получения альбомов пользователя!");
                    }
                });
            }
        );
    }


    function getPhotosForAlbum(key) {
        downloaded[key] = $.Deferred();
        FB.api(
            '/' + albums[key].id + '/photos',
            //{fields: 'id'},
            function (albumPhotosResponse) {
                console.log("albumPhotosResponse:")
                console.log(albumPhotosResponse);
                if (albumPhotosResponse && !albumPhotosResponse.error) {
                    //console.log( ' got photos for album ' + albumId );
                    var facebookPhoto;
                    for (var i = 0; i < albumPhotosResponse.data.length; i++) {
                        facebookPhoto = albumPhotosResponse.data[i];
                        //console.log("facebookPhoto:");
                        //console.log(facebookPhoto);
                        albums[key].photos.push({
                            'id': facebookPhoto.id,
                            'name': facebookPhoto.name,
                            'added': facebookPhoto.created_time,
                            'url': makeFacebookPhotoURL(facebookPhoto.id)
                        });
                    }
                    // если мы обработали последний альбом, можно выводить содержимое
                    downloaded[key].resolve();
                }
            }
        );
    }


    function getPhotos() {
        for (var j = 0; j < albums.length; j++) {
            albums[j].photos = [];
            console.log(albums[j].name);
            getPhotosForAlbum(j);
        }
        //
        $.when.apply($, downloaded ).then( function() { outputAlbums(); } );
    }


    function outputAlbums() {
        //вывод
        var html = '<ul id="albums" class="list-group">';
        for (var i = 0; i < albums.length; i++) {
            html += '<li id="' + albums[i].id + '" class="list-group-item"><span class="badge">' + albums[i].photos.length + '</span>' + albums[i].name + '</li>';
        }
        html += '</ul>';
        alert(html);
        $(albumsID).replaceWith(html);

        // Вывод содержимого альбома по клику
        $(albumsID+' li').click( function() {
            // только для не активного альбома
            if( !$(this).hasClass('active') ) {
                $(albumsID+' li').toggleClass('active', false);
                $(this).toggleClass('active');
                //
                var id = $(this).attr('id');
                var content = '<div id="photos" class="panel panel-primary">'
                    + '<div class="panel-heading"></div>'
                    + '<div class="panel-body">';
                var albumName = '';
                LocalBreak:
                for (var i = 0; i < albums.length; i++) {
                    if(albums[i].id == id) {
                        albumName = albums[i].name;
                        var photo, name;
                        for (var j = 0; j < albums[i].photos.length; j++) {
                            photo = albums[i].photos[j];
                            if( !photo.name ) name = 'No description'; else name = photo.name;
                            content += '<a href="' + photo.url + '" class="thumbnail">'
                                + '<img src="' + photo.url + '" alt="' + name + '"></a>';
                        }
                        break LocalBreak;
                    }
                }
                content += '</div></div>';
                $(photosID).replaceWith(content);
                albumName = 'Фотографии из альбома «' + albumName + '»';
                $(photosID +' div.panel-heading').text(albumName);
                $(photosID).hide().fadeIn(2000);

                // Подсказка: Показать при заходе мыши
                $(photosID).on('mouseenter', '.thumbnail img', function(e){
                    if( !$('#tooltip').length ) {
                        var tooltipStr = $(this).attr('alt');
                        var $tooltip = $('<div/>', {
                            text: tooltipStr,
                            id: 'tooltip',
                            css: {
                                display: 'block',
                                position: 'absolute',
                                top: '0px',
                                left: '0px',
                                margin: '0px',
                                padding: '5px',
                                fontSize: '0.7em',
                                color: '#000000',
                                backgroundColor: '#FFFFFF',
                                verticalAlign: 'middle',
                                textAlign: 'center'
                            }
                        });
                        $(photosID).after($tooltip);
                    } else {
                        var $tooltip = $('#tooltip');
                        $tooltip.stop(true, true);
                        $tooltip.text( $(this).attr('alt') );
                        $tooltip.offset( {top: e.pageY+25, left: e.pageX} );
                        $tooltip.fadeIn(600);
                    }
                } );

                // Подсказка: Убрать
                $(photosID).on('mouseleave', '.thumbnail img', function(){
                    var $tooltip = $('#tooltip');
                    $tooltip.fadeOut(400);
                } );

                // Подсказка: Движение за курсором
                $(photosID).on('mousemove', '.thumbnail img', function(e){
                   var $tooltip = $('#tooltip');
                    if( $tooltip ) {
                        $tooltip.offset( {top: e.pageY+25, left: e.pageX} );
                    }
                } );

            }
        });
    }


    this.clearHTML = function() {
        $(albumsID).addClass('hidden');
        $(photosID).addClass('hidden');
    }

}
