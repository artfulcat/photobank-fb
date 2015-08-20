<?php
/**
 *
 */

    // Конектимся к нашей БД
    $link = mysql_connect("localhost", "root", "") or die("Could not connect : " . mysql_error());

    if( !mysql_select_db("tracker") ) {
        // если БД нет, создадим ее и таблицу в ней
        mysql_query("CREATE DATABASE tracker") or die(mysql_error());
        mysql_select_db("tracker") or die(mysql_error());
        mysql_query("CREATE TABLE events (
                EventId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                UserId TEXT,
                UserName TEXT,
                EventType TEXT,
                EventElement TEXT,
                EventElementId TEXT,
                EventTime TIMESTAMP
            )") or die(mysql_error());
        echo 'CREATE DATABASE tracker';
    }

    // у нас есть БД 'tracker' и таблица 'events': сохраним полученные данные
    $time = date("Y-m-d H:i:s" , $_POST['event_time']); // секунды в строку времени SQL
    $strSQL = "INSERT INTO events (UserId, UserName, EventType, EventElement, EventElementId, EventTime) VALUES ('"
        .$_POST['user_id']."','"
        .$_POST['user_name']."','"
        .$_POST['event_type']."','"
        .$_POST['event_element']."','"
        .$_POST['event_element_id']."','"
        .$time."')";
    mysql_query($strSQL) or die(mysql_error());



    mysql_close($link);