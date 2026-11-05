<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

if (isset($_GET['pregunta'])) {
    $pregunta = escapeshellarg($_GET['pregunta']);  // Escapar la pregunta para evitar vulnerabilidades
    echo "Pregunta recibida: " . $pregunta . "<br>";  // Depuración

    $comando = "C:/Users/Dreak/AppData/Local/Programs/Python/Python313/python.exe C:/Users/Dreak/Desktop/programacion/bot_radiodj/samprespuesta/chatbot.py $pregunta";
    
    // Ejecutar el comando
    $respuesta = shell_exec($comando);
    
    // Verificar si la respuesta no es null y mostrarla
    if ($respuesta !== null) {
        echo 'Respuesta: ' . htmlspecialchars($respuesta);
    } else {
        echo 'No se obtuvo una respuesta válida.';
    }
} else {
    echo 'No se ha recibido ninguna pregunta.';
}
?>
