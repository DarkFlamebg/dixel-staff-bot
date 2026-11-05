<?php
// Configuración de la conexión a la base de datos
$host = '107.6.152.20';
$username = 'zcnqdpcq_paneldreak';
$password = 'zo-Y0mMjnl}[';
$dbname = 'zcnqdpcq_paneldreak';

// Establecer la conexión a la base de datos
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo "Conexión fallida: " . $e->getMessage();
    exit;
}

// Después de actualizar los datos de la pregunta y respuesta
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    $id = $_POST['id'];
    $pregunta = $_POST['pregunta'];
    $respuesta = $_POST['respuesta'];

    // Actualizar los datos de la pregunta y respuesta
    $sql = "UPDATE preguntas_respuestas SET pregunta = :pregunta, respuesta = :respuesta WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->bindParam(':pregunta', $pregunta, PDO::PARAM_STR);
    $stmt->bindParam(':respuesta', $respuesta, PDO::PARAM_STR);
    $stmt->execute();

    echo "<script>alert('Registro actualizado exitosamente');</script>";

    // Redirigir a la misma página
    header('Location: queryrcon.php');
    // exit();
}

// Después de insertar una nueva pregunta
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['nueva_pregunta']) && isset($_POST['nueva_respuesta'])) {
    $nueva_pregunta = $_POST['nueva_pregunta'];
    $nueva_respuesta = $_POST['nueva_respuesta'];

    // Insertar nueva pregunta y respuesta
    $sql = "INSERT INTO preguntas_respuestas (pregunta, respuesta) VALUES (:pregunta, :respuesta)";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':pregunta', $nueva_pregunta, PDO::PARAM_STR);
    $stmt->bindParam(':respuesta', $nueva_respuesta, PDO::PARAM_STR);
    $stmt->execute();

    echo "<script>alert('Pregunta agregada exitosamente');</script>";

    // Redirigir a la misma página
    header('Location: queryrcon.php');
    // exit();
}

// Después de eliminar una pregunta
if (isset($_GET['eliminar'])) {
    $id_a_eliminar = $_GET['eliminar'];
    $sql = "DELETE FROM preguntas_respuestas WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id', $id_a_eliminar, PDO::PARAM_INT);
    $stmt->execute();

    echo "<script>alert('Pregunta eliminada exitosamente');</script>";

    // Redirigir a la misma página
    header('Location: queryrcon.php');
    // exit();
}


// Obtener todas las preguntas y respuestas
$sql = "SELECT * FROM preguntas_respuestas";
$stmt = $pdo->prepare($sql);
$stmt->execute();
$preguntas = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ver y Editar Preguntas y Respuestas</title>
    <style>
        /* Estilos generales */
        body {
            font-family: Arial, sans-serif;
            background-color: #2e2e2e;
            color: #f1f1f1;
            margin: 0;
            padding: 0;
        }

        h1 {
            text-align: center;
            color: #f1f1f1;
            padding-top: 20px;
        }

        table {
            width: 80%;
            margin: 20px auto;
            border-collapse: collapse;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid #444;
        }

        th {
            background-color: #333;
        }

        tr:nth-child(even) {
            background-color: #444;
        }

        tr:hover {
            background-color: #555;
        }

        button {
            background-color: #4CAF50;
            color: white;
            padding: 5px 10px;
            border: none;
            cursor: pointer;
            border-radius: 4px;
        }

        button:hover {
            background-color: #45a049;
        }

        /* Estilos del formulario de edición */
        .editable {
            background-color: #333;
            color: #f1f1f1;
            border: none;
            padding: 5px;
            border-radius: 4px;
            width: 100%;
            text-align: left;
        }

        .editable:focus {
            outline: 2px solid #4CAF50;
        }

        .save-btn {
            margin-top: 10px;
            background-color: #4CAF50;
            color: white;
            padding: 5px 10px;
            border: none;
            cursor: pointer;
            border-radius: 4px;
        }

        .save-btn:hover {
            background-color: #45a049;
        }

        /* Modal estilos */
        .modal {
            display: none; /* Oculto por defecto */
            position: fixed;
            z-index: 1;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.4);
            padding-top: 60px;
        }

        .modal-content {
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 500px;
        }

        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
        }

        .close:hover,
        .close:focus {
            color: black;
            text-decoration: none;
            cursor: pointer;
        }

        .modal input {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            background-color: #f1f1f1;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        /* Estilos para el botón de agregar pregunta centrado */
        .center-button {
            display: block;
            width: 200px;
            margin: 30px auto;
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            border: none;
            cursor: pointer;
            border-radius: 4px;
            text-align: center;
        }

        .center-button:hover {
            background-color: #45a049;
        }
    </style>
</head>
<body>

<h1>Preguntas y Respuestas</h1>

<!-- Botón para abrir el modal centrado -->
<button id="openModalBtn" class="center-button">Agregar Pregunta</button>

<!-- Modal para agregar pregunta -->
<div id="addQuestionModal" class="modal">
    <div class="modal-content">
        <span class="close" id="closeModalBtn">&times;</span>
        <h2>Agregar Nueva Pregunta</h2>
        <form action="queryrcon.php" method="POST">
            <input type="text" name="nueva_pregunta" placeholder="Escribe la nueva pregunta" required>
            <input type="text" name="nueva_respuesta" placeholder="Escribe la respuesta" required>
            <button type="submit">Agregar Pregunta</button>
        </form>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>ID</th>
            <th>Pregunta</th>
            <th>Respuesta</th>
            <th>Acción</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($preguntas as $pregunta): ?>
            <tr>
                <td><?= htmlspecialchars($pregunta['id']) ?></td>
                <td><span class="editable" contenteditable="true" id="pregunta-<?= $pregunta['id'] ?>"><?= htmlspecialchars($pregunta['pregunta']) ?></span></td>
                <td><span class="editable" contenteditable="true" id="respuesta-<?= $pregunta['id'] ?>"><?= htmlspecialchars($pregunta['respuesta']) ?></span></td>
                <td>
                    <button onclick="guardarCambios(<?= $pregunta['id'] ?>)">Guardar</button>
                    <a href="?eliminar=<?= $pregunta['id'] ?>"><button>Eliminar</button></a>
                </td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>

<script>
    // Función para abrir el modal
    document.getElementById("openModalBtn").onclick = function() {
        document.getElementById("addQuestionModal").style.display = "block";
    }

    // Función para cerrar el modal
    document.getElementById("closeModalBtn").onclick = function() {
        document.getElementById("addQuestionModal").style.display = "none";
    }

    // Función para guardar los cambios de las preguntas y respuestas
    function guardarCambios(id) {
        var pregunta = document.getElementById('pregunta-' + id).innerText;
        var respuesta = document.getElementById('respuesta-' + id).innerText;

        // Crear un formulario y enviarlo mediante POST
        var form = document.createElement('form');
        form.method = 'POST';
        form.action = 'queryrcon.php';
        
        var idField = document.createElement('input');
        idField.type = 'hidden';
        idField.name = 'id';
        idField.value = id;
        form.appendChild(idField);

        var preguntaField = document.createElement('input');
        preguntaField.type = 'hidden';
        preguntaField.name = 'pregunta';
        preguntaField.value = pregunta;
        form.appendChild(preguntaField);

        var respuestaField = document.createElement('input');
        respuestaField.type = 'hidden';
        respuestaField.name = 'respuesta';
        respuestaField.value = respuesta;
        form.appendChild(respuestaField);

        document.body.appendChild(form);
        form.submit();
    }
</script>

</body>
</html>
