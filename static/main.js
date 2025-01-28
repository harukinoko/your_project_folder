import * as THREE from 'three';

// シーン、カメラ、レンダラーの初期化
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#three-canvas'),
    antialias: true
});
renderer.setSize( window.innerWidth, window.innerHeight );

// レンダラーで影を有効にする
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // より滑らかな影

// 地面
const groundGeometry = new THREE.PlaneGeometry( 300, 300 );
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('/static/texture.jpg');
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set( 16, 16 );
const groundMaterial = new THREE.MeshStandardMaterial( {
    map: groundTexture,
    side: THREE.DoubleSide,
    emissive: 0x404040, // 自発光の色を設定
    emissiveIntensity: 0.2 // 自発光の強度を設定
} );
const ground = new THREE.Mesh( groundGeometry, groundMaterial );
ground.rotation.x = - Math.PI / 2;
ground.position.y = 0;
scene.add( ground );
ground.receiveShadow = true;

// 球体（アバター）
const sphereGeometry = new THREE.SphereGeometry( 0.25, 32, 16 );
const sphereMaterial = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
const sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
sphere.position.set( 0, 0.25, 4 );
sphere.castShadow = true;
scene.add( sphere );

camera.position.set( 0, 0.75, 4 );
camera.lookAt( sphere.position );

// 環境光
const ambientLight = new THREE.AmbientLight( 0x808080 );
scene.add( ambientLight );

// 平行光源
const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
directionalLight.position.set( -5, 5, 5 );
directionalLight.castShadow = true;

// 影の範囲と解像度を設定
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;

scene.add( directionalLight );

// 背景を空の画像に設定
const skyTexture = textureLoader.load('/static/sky.jpg');
scene.background = skyTexture;

// リラクゼーションエリアの境界
const areaSize = 20; // エリアのサイズ
const areaGeometry = new THREE.PlaneGeometry(areaSize, areaSize);

// リラクゼーションエリア1 (元のエリア)
const areaMaterial1 = new THREE.MeshBasicMaterial({ color: 0xccffcc, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
const relaxationArea1 = new THREE.Mesh(areaGeometry, areaMaterial1);
relaxationArea1.rotation.x = -Math.PI / 2;
relaxationArea1.position.set(5, 0.001, -5); // 少し浮かせる
scene.add(relaxationArea1);

// リラクゼーションエリアの中心座標
const area1Position = new THREE.Vector3(5, 0, -5);

// 門の作成関数
function createGate(x, y, z) {
    const gateWidth = 2;
    const gateHeight = 2.2;
    const gateDepth = 0.5;
    const gateColor = 0x987654; // 門の色

    // 門の柱（左）
    const leftGateGeometry = new THREE.BoxGeometry(gateDepth, gateHeight, gateDepth);
    const gateMaterial = new THREE.MeshStandardMaterial({ color: gateColor });
    const leftGate = new THREE.Mesh(leftGateGeometry, gateMaterial);
    leftGate.position.set(x - gateWidth / 2, y + gateHeight / 2, z);
    leftGate.castShadow = true;
    leftGate.receiveShadow = true;
    scene.add(leftGate);

    // 門の柱（右）
    const rightGateGeometry = new THREE.BoxGeometry(gateDepth, gateHeight, gateDepth);
    const rightGate = new THREE.Mesh(rightGateGeometry, gateMaterial);
    rightGate.position.set(x + gateWidth / 2, y + gateHeight / 2, z);
    rightGate.castShadow = true;
    rightGate.receiveShadow = true;
    scene.add(rightGate);

    // 門の上部
    const topGateGeometry = new THREE.BoxGeometry(gateWidth + gateDepth, gateDepth, gateDepth);
    const topGate = new THREE.Mesh(topGateGeometry, gateMaterial);
    topGate.position.set(x, y + gateHeight + gateDepth / 2, z);
    topGate.castShadow = true;
    topGate.receiveShadow = true;
    scene.add(topGate);

    return { left: leftGate, right: rightGate, top: topGate };
}

// 門を複数配置
const gates = [];
for (let i = 0; i < 3; i++) { // 門の数を3つに変更
    const gate = createGate(i * 5 - 5, 0, 10); // 門の間隔を調整
    gates.push(gate);
}

// 衝突判定用の関数
function checkCollision() {
    sphere.geometry.computeBoundingSphere();
    const sphereBoundingSphere = sphere.geometry.boundingSphere.clone();
    sphereBoundingSphere.center.add(sphere.position);

    // 門との衝突判定
    for (let gate of gates) {
        const leftGateBox = new THREE.Box3().setFromObject(gate.left);
        const rightGateBox = new THREE.Box3().setFromObject(gate.right);
        const topGateBox = new THREE.Box3().setFromObject(gate.top);

        if (sphereBoundingSphere.intersectsBox(leftGateBox) ||
            sphereBoundingSphere.intersectsBox(rightGateBox) ||
            sphereBoundingSphere.intersectsBox(topGateBox)) {
            sphere.position.copy(previousSpherePosition);
            return; // 一つでも衝突したら関数を終了
        }
    }
}

// カメラの移動速度
const moveSpeed = 0.05;
// マウス感度
const mouseSensitivity = 0.002;

// マウスの動きを追跡するための変数
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;

// マウスダウンイベント
renderer.domElement.addEventListener('mousedown', () => {
    isMouseDown = true;
});

// マウスアップイベント
renderer.domElement.addEventListener('mouseup', () => {
    isMouseDown = false;
});

// マウス移動イベント
renderer.domElement.addEventListener('mousemove', (event) => {
    if (!isMouseDown) return;

    const deltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const deltaY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    mouseX += deltaX * mouseSensitivity;
    mouseY += deltaY * mouseSensitivity;

    // マウスの動きに基づいてカメラの方向を調整
    const cameraDirection = new THREE.Vector3(0, 0, -1); // 初期方向
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromEuler(new THREE.Euler(mouseY, -mouseX, 0, 'YXZ'));
    cameraDirection.applyMatrix4(rotationMatrix);

    camera.lookAt(camera.position.clone().add(cameraDirection));
});

// アバターの位置を保存する変数
let previousSpherePosition = sphere.position.clone();

// 環境音
let isWithinArea1 = false;

// オーディオローダーの作成
const audioLoader = new THREE.AudioLoader();

// 環境音用のリスナー
const ambientListener = new THREE.AudioListener();
camera.add(ambientListener);

// 環境音用のAudioオブジェクトの作成
const ambientSound = new THREE.Audio(ambientListener);

// 環境音の読み込み状態を追跡するフラグ
let soundLoaded = false;

// 環境音の読み込み
audioLoader.load('/static/ambient_sound1.mp3', function (buffer) {
  ambientSound.setBuffer(buffer);
  ambientSound.setLoop(true);
  ambientSound.setVolume(0.5);
  soundLoaded = true;
});

// 十字キーでアバターを移動
document.addEventListener('keydown', (event) => {
    // オーディオコンテキストの状態を確認し、必要に応じて再開
    if (!isAudioContextResumed) {
        if (ambientListener.context.state === 'suspended') {
            ambientListener.context.resume().then(() => {
                console.log('AudioContext 再開成功');
                isAudioContextResumed = true;
            }).catch((e) => {
                console.error('AudioContext 再開エラー:', e);
            });
        }
    }

    // カメラの方向ベクトルを取得
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Y方向への移動をなくす

    // 移動前の位置を保存
    previousSpherePosition.copy(sphere.position);

    switch (event.key) {
        case 'ArrowUp':
            sphere.position.add(cameraDirection.multiplyScalar(moveSpeed)); // 前進
            break;
        case 'ArrowDown':
            sphere.position.sub(cameraDirection.multiplyScalar(moveSpeed)); // 後退
            break;
        case 'ArrowLeft':
            sphere.position.add(cameraDirection.clone().cross(camera.up).multiplyScalar(-moveSpeed)); // 左へ移動
            break;
        case 'ArrowRight':
            sphere.position.add(cameraDirection.clone().cross(camera.up).multiplyScalar(moveSpeed)); // 右へ移動
            break;
    }

    // カメラの位置を更新
    camera.position.set(sphere.position.x, sphere.position.y + 0.5, sphere.position.z + 4);
    camera.lookAt(sphere.position);

    // カメラのY座標が0.5より下に行かないように制限
    camera.position.y = Math.max(camera.position.y, 0.5);

    checkCollision(event);

    // リラクゼーションエリア内外の判定
    const distanceToArea1 = sphere.position.distanceTo(area1Position);

    // エリアの判定と環境音の再生/停止
    let playAmbientSound = distanceToArea1 < areaSize / 2 && soundLoaded;
    if (playAmbientSound && !ambientSound.isPlaying) {
        ambientSound.play();
    } else if (!playAmbientSound && ambientSound.isPlaying) {
        ambientSound.stop();
    }
});

// オーディオコンテキストの再開
let isAudioContextResumed = false;

function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
}

animate();

// ------------------- ここからチャット機能関連のコード -------------------
//ユーザー名の保存
let currentUsername = localStorage.getItem('username') || "User"; // ローカルストレージから取得、なければデフォルト値

// 初期表示時にユーザー名入力欄に設定
document.getElementById('username-input').value = currentUsername;


function fetchMessages() {
    fetch('/api/messages')
        .then(response => response.json())
        .then(messages => {
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML = ''; // メッセージを一旦クリア
            messages.forEach(message => {
                const messageElement = document.createElement('p');
                messageElement.textContent = `${message.username}: ${message.message}`;
                chatMessages.appendChild(messageElement);
            });
        });
}

// 送信ボタンがクリックされたら、メッセージを送信
document.getElementById('send-button').addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value;
    if (message) {
        fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(currentUsername)}&message=${encodeURIComponent(message)}`,
        })
        .then(response => {
            if (response.ok) {
                messageInput.value = '';
                fetchMessages();
            } else {
                console.error('メッセージの送信に失敗しました');
            }
        })
        .catch(error => {
            console.error('エラー:', error);
        });
    }
});

// ユーザー名保存ボタンのイベントリスナー
document.getElementById('save-username').addEventListener('click', () => {
    currentUsername = document.getElementById('username-input').value;
    localStorage.setItem('username', currentUsername);
    alert(`${currentUsername}をユーザー名として設定しました`);
    document.getElementById('username-form').style.display = 'none'; // フォームを非表示
    document.getElementById('message-input').focus(); // メッセージ入力欄にフォーカス
});

// 表示切り替えボタンを追加
const toggleButton = document.createElement('button');
toggleButton.textContent = 'ユーザー名変更';
toggleButton.style.marginTop = '5px';
toggleButton.addEventListener('click', () => {
    const usernameForm = document.getElementById('username-form');
    usernameForm.style.display = usernameForm.style.display === 'none' ? 'flex' : 'none';
});
document.getElementById('chat-container').prepend(toggleButton); // チャットコンテナの先頭に追加

// 定期的にメッセージを取得
setInterval(fetchMessages, 2000);

//ページ読み込み時にメッセージをクリアする関数
function clearMessages() {
    fetch('/api/clear_messages', {
        method: 'POST',
    })
    .then(response => {
        if (response.ok) {
            fetchMessages(); // メッセージを再取得して表示を更新
        } else {
            console.error('メッセージのクリアに失敗しました');
        }
    })
    .catch(error => {
        console.error('エラー:', error);
    });
}

window.addEventListener('load', clearMessages);

// 定期的にメッセージを取得
setInterval(fetchMessages, 2000); // 2秒ごとにメッセージを取得

//ユーザーを識別するID
let myUserId = null;

fetch('/api/session')
  .then(response => response.json())
  .then(data => {
    myUserId = data.user_id;
    currentUsername = localStorage.getItem(myUserId) || "User"; // ユーザー名を更新
    document.getElementById('username-input').value = currentUsername;

    // ユーザー色を positions から取得
    userColors[myUserId] = data.color;

    // ユーザー色を反映
    sphere.material.color.set(data.color);
  });

// ユーザー名保存ボタンのイベントリスナー
document.getElementById('save-username').addEventListener('click', () => {
  currentUsername = document.getElementById('username-input').value;
  localStorage.setItem(myUserId, currentUsername); // ユーザー名を更新
  alert(`${currentUsername}をユーザー名として設定しました`);
  document.getElementById('username-form').style.display = 'none'; // フォームを非表示
  document.getElementById('message-input').focus(); // メッセージ入力欄にフォーカス
});

// 他のユーザーのアバターを管理するオブジェクト
const otherPlayers = {};


// 自分の位置情報を定期的に送信
setInterval(() => {
    if (!myUserId) return; // ユーザーIDがまだ設定されていない場合は送信しない

    fetch('/api/positions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `userId=${encodeURIComponent(myUserId)}&x=${sphere.position.x}&y=${sphere.position.y}&z=${sphere.position.z}`,
    })
    .then(response => {
        if (!response.ok) {
            console.error('位置情報の送信に失敗しました');
        }
    })
    .catch(error => {
        console.error('エラー:', error);
    });
}, 2000); // 2秒ごとに送信

// 他のユーザーの位置情報を取得して更新
function fetchPositions() {
    fetch('/api/positions')
        .then(response => response.json())
        .then(positions => {
            // 取得した位置情報を使って、他のユーザーのアバターの位置を更新
            for (const userId in positions) {
                if (userId === myUserId) continue; // 自分自身はスキップ

                if (!otherPlayers[userId]) {
                    // 他のユーザーのアバターがまだ存在しない場合は作成
                    const otherSphereGeometry = new THREE.SphereGeometry(0.25, 32, 16);
                    const otherSphereMaterial = new THREE.MeshStandardMaterial({ color: positions[userId].color });
                    otherPlayers[userId] = new THREE.Mesh(otherSphereGeometry, otherSphereMaterial);
                    scene.add(otherPlayers[userId]);
                }

                // アバターの位置を更新
                otherPlayers[userId].position.set(positions[userId].x, positions[userId].y, positions[userId].z);
            }
        });
}

// 定期的に他のユーザーの位置情報を取得
setInterval(fetchPositions, 2000); // 2秒ごとに取得



