/**
 * FB Photobank
 */

function Photobank(loginID, statusID, albumsID, photosID) {
    var loginResponse = null;
    var accessToken = '';

    var userFB = {
        id: null,
        name: null
    };

    var albums = [];

    // обработчик логина и скачаных альбомов
    var logined = $.Deferred();
    var downloaded = []; // of $.Deferred();


    /**
     * Функция возвращающая URL фотографии ФБ
     * @param id - идентификатор фотографии
     * @returns {string} - адрес фотографии
     * -----------------------------------------------------------------------------------------------------------------
     */
    function makeFacebookPhotoURL( id ) {
        return 'https://graph.facebook.com/' + id + '/picture?access_token=' + accessToken;
    }


    /**
     * Функция проверки лолгин-статуса и вывода его
     * -----------------------------------------------------------------------------------------------------------------
     */
    function checkLoginStatus() {
        FB.getLoginStatus(function(response) {
            // сохраним данные пользователя и отобразим статус
            loginResponse = response;
            // Есть конект:
            if (response.status === 'connected') {
                console.log('Welcome!  Fetching your information.... ');
                userFB.id = response.authResponse.userID;
                accessToken = response.authResponse.accessToken || '';
                // Мы залогинились, обработаем это
                logined.resolve();
                $(loginID).addClass("logined").text("Logout").toggleClass('btn-warning', true);
                FB.api('/me', function(response) {
                    userFB.name = response.name;
                    $(statusID).html('Thanks for logging in, ' + response.name + '!');
                });
            } else {
                // Нет конекта:
                logined = $.Deferred(); // сброс состояния конекта
                $(loginID).removeClass('logined btn-warning').text("Login").toggleClass('btn-success',true);
                if (response.status === 'not_authorized') {
                    $(statusID).html('Please log into this app');
                } else {
                    $(statusID).html('Please log into Facebook');
                }
            }
        });
    }


    /**
     * Разлогиниться
     * -----------------------------------------------------------------------------------------------------------------
     */
    this.logout = function() {
        FB.logout(function(response) {
                // мы разлогинились, обработаем это
                checkLoginStatus();
        });
    }


    /**
     * Залогиниться
     * -----------------------------------------------------------------------------------------------------------------
     */
    this.login = function() {
        if(!loginResponse) {
            // мы еще не логинились, проверим может мы в конекте
            checkLoginStatus();
        } else {
            FB.login(function(response) {
                if (response.authResponse) {
                    // мы залогинились, обработаем это
                    checkLoginStatus();
                } else {
                    console.log('User cancelled login or did not fully authorize.');
                }
            },{scope: 'user_photos'} ); //user_photos,public_profile,email
        }
    }


    /**
     * Получить список альбомов пользователя и вывести их после загрузки
     * -----------------------------------------------------------------------------------------------------------------
     */
    this.getAlbums = function() {
        // когда мы уже залогинимся, нужно запросить фотоальбомы
        logined.done( function() {
            FB.api(
                '/me/albums',
                //{fields: 'id,cover_photo'},
                function(albumResponse) {
                    if (albumResponse && !albumResponse.error) {
                        albums = albumResponse.data;
                        getPhotos();
                    } else {
                        alert("Error retrieving user albums!");
                    }
                });
            }
        );
    }


    /**
     * Получить фото с каждого альбома
     * -----------------------------------------------------------------------------------------------------------------
     */
    function getPhotos() {
        for (var j = 0; j < albums.length; j++) {
            albums[j].photos = [];
            console.log(albums[j].name);
            getPhotosForAlbum(j);
        }
        // Обработчик загрузки всех фото: вывести их
        $.when.apply($, downloaded ).then( function() { outputAlbums(); } );
    }


    /**
     * Получить фото с альбома
     * @param key - индекс в массиве альбомов
     * -----------------------------------------------------------------------------------------------------------------
     */
    function getPhotosForAlbum(key) {
        downloaded[key] = $.Deferred();
        FB.api(
            '/' + albums[key].id + '/photos',
            //{fields: 'id'},
            function (albumPhotosResponse) {
                if (albumPhotosResponse && !albumPhotosResponse.error) {
                    var facebookPhoto;
                    for (var i = 0; i < albumPhotosResponse.data.length; i++) {
                        facebookPhoto = albumPhotosResponse.data[i];
                        albums[key].photos.push({
                            'id': facebookPhoto.id,
                            'name': facebookPhoto.name,
                            'added': facebookPhoto.created_time,
                            'url': makeFacebookPhotoURL(facebookPhoto.id)
                        });
                    }
                    // отметим альбом загруженным
                    downloaded[key].resolve();
                }
            }
        );
    }


    /**
     * Создание и вывод HTML-кода альбомов и их содержимого
     * -----------------------------------------------------------------------------------------------------------------
     */
    function outputAlbums() {
        // вывод списка альбомов
        var html = '';
        var cls = 'list-group-item';
        html += '<div id="albums" class="panel panel-primary"><div class="panel-heading">Your Albums</div><div class="panel-body">';
        html += '<ul class="list-group">';
        for (var i = 0; i < albums.length; i++) {
            if(albums[i].name == 'Profile Pictures') cls = 'list-group-item active';  else cls = 'list-group-item';
            html += '<li id="' + albums[i].id + '" class="' + cls + '"><span class="badge">' + albums[i].photos.length + '</span>' + albums[i].name + '</li>';
        }
        html += '</ul>';
        html += '</div></div></div>';
        $(albumsID).replaceWith(html);

        // КЛИК на альбоме: вывод содержимого альбома по клику----------------------------------------------------------
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
                                + '<img id="' + photo.id + '" src="' + photo.url + '" alt="' + name + '"></a>';
                        }
                        break LocalBreak;
                    }
                }
                content += '</div></div>';
                $(photosID).replaceWith(content);
                albumName = 'Photos from the album «' + albumName + '»';
                $(photosID +' div.panel-heading').text(albumName);
                $(photosID).hide().fadeIn(2000);

                // ПОДСКАЗКА: Показать при заходе мыши -----------------------------------------------------------------
                $(photosID).on('mouseenter', '.thumbnail img', function(e){
                    // Создать
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
                $(photosID).on('mousemove', function(e){
                   var $tooltip = $('#tooltip');
                    if( $tooltip ) {
                        $tooltip.offset( {top: e.pageY+25, left: e.pageX} );
                    }
                } );

                // При скроле убирать подсказку
                $(window).scroll( function(){
                    $('#tooltip').css('display','none');
                });

                // ВСПЛЫВАЮЩАЯ КАРТИНКА: после клика по миниатюре ------------------------------------------------------
                $(photosID).on('click', '.thumbnail img', function(e) {
                    e.preventDefault();
                    var $bigPhoto = $('<div/>', {
                        text: '',
                        id: 'big-photo',
                        css: {
                            display: 'block',
                            zIndex: '1000',
                            position: 'fixed',
                            top: '0px',
                            left: '0px',
                            width: document.documentElement.clientWidth + 'px',
                            height: document.documentElement.clientHeight + 'px',
                            margin: '0px',
                            padding: Math.ceil(document.documentElement.clientHeight*0.05) + 'px ',
                            fontSize: '0.7em',
                            color: '#000000',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            verticalAlign: 'middle',
                            textAlign: 'center'
                        }
                    });
                    var $imgFrame = $('<div/>', {
                        id: '',
                        class: 'img-frame',
                        css: {
                            display: 'inline-block',
                            zIndex: '1001',
                            //position: 'absolute',
                            //top: '0px',
                            //left: '0px',
                            //bottom: '0px',
                            //right: '0px',
                            width: 'auto',
                            height: 'auto',
                            margin: 'auto',
                            padding: '1%',
                            fontSize: '0.7em',
                            color: '#000000',
                            backgroundColor: 'rgba(255, 255, 255, 1.0)',
                            boxShadow: '5px 5px 10px rgba(0, 0, 0, 1.0)',
                            verticalAlign: 'middle',
                            textAlign: 'center'
                        }
                    }).appendTo($bigPhoto);
                    var $img = $('<img/>', {
                        id: '',
                        src: $(this).attr('src'),
                        alt: $(this).attr('alt'),
                        css: {
                            display: 'inline-block',
                            zIndex: '1002',
                            width: 'auto',
                            maxHeight: Math.ceil(document.documentElement.clientHeight*0.8),
                            maxWidth: Math.ceil(document.documentElement.clientWidth*0.8),
                            margin: 'auto',
                            padding: '0px',
                            backgroundColor: 'rgba(255, 255, 255, 1.0)',
                            border: '1px solid rgba(0, 0, 0, 1.0)'
                        }
                    }).appendTo($imgFrame);
                    $('body').after($bigPhoto);

                    // По клику удалять
                    $bigPhoto.on('click', function() {
                        $(this).remove();
                    });

                    // По ресайзу окна удалять
                    $(window).on('resize', function() {
                        $('#big-photo').remove();
                    });
                });
            }
        });

        // СЛЕЖЕНИЕ: отслеживание действий пользователей----------------------------------------------------------------
        // Альбомы и миниатюры
        $('body').on('mouseenter click', albumsID + ' .list-group-item, '+ photosID + ' .thumbnail img', function(e) {
            var elem = 'image';
            if( $(this).hasClass('list-group-item') ) elem = 'album';
            $.post("tracker.php",
                {
                    user_id: userFB.id,
                    user_name: userFB.name,
                    event_type: e.type,
                    event_element: elem,
                    event_element_id: $(this).attr('id'),
                    event_time: Math.round(e.timeStamp / 1000)
                },
                function (data) { /* alert("Полученные данные: " + data); */ }
            );
        });

        // "кликнем" по первом альбому
        $(albumsID+' .active').removeClass('active').trigger('click');
    }


    /**
     * Функция скрытия альбомов и их сореджимого
     * -----------------------------------------------------------------------------------------------------------------
     */
    this.clearHTML = function() {
        $(albumsID).addClass('hidden');
        $(photosID).addClass('hidden');
    }

}
