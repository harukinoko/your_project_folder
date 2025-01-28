from flask import Flask, render_template, request, jsonify, session
import json
import time
import uuid
import random

app = Flask(__name__, static_folder='static')
app.secret_key = 'your_secret_key'

# メッセージを保存するファイル (変更なし)
MESSAGES_FILE = 'messages.json'

# ユーザーの位置情報を保存する辞書 {ユーザーID: {x: 0, y: 0, z: 0, last_update: タイムスタンプ, color: "#123456"}}
user_positions = {}

# メッセージをメモリ上に保持 (簡易的な例)
messages = []
try:
    with open(MESSAGES_FILE, 'r') as f:
        messages = json.load(f)
except FileNotFoundError:
    messages = []

# メッセージを定期的にファイルに書き込む (簡易的な例)
def save_messages():
    with open(MESSAGES_FILE, 'w') as f:
        json.dump(messages, f)

@app.route("/")
def index():
    # ユーザーIDの生成とセッションへの保存
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        session['user_color'] = '#%06x' % random.randint(0, 0xFFFFFF)  # ランダムな色を生成

    return render_template('index.html')

# メッセージを取得するAPI (変更なし)
@app.route('/api/messages', methods=['GET'])
def get_messages():
    return jsonify(messages)

# メッセージを送信するAPI (改善)
@app.route('/api/messages', methods=['POST'])
def post_message():
    global messages
    username = request.form['username']
    message = request.form['message']
    messages.append({'username': username, 'message': message, 'id': len(messages)})
    save_messages()  # メッセージをファイルに保存
    return jsonify({'status': 'success'})

# メッセージをクリアするAPI (改善)
@app.route('/api/clear_messages', methods=['POST'])
def clear_all_messages():
    global messages
    messages = []
    save_messages()
    return jsonify({'status': 'success'})

# ユーザーの位置情報を更新するAPI (変更)
@app.route('/api/positions', methods=['POST'])
def update_position():
    user_id = session.get('user_id')
    if user_id is None:
        return jsonify({'status': 'error', 'message': 'User ID not found'}), 400

    # リクエストボディから位置情報を取得
    try:
        x = float(request.form['x'])
        y = float(request.form['y'])
        z = float(request.form['z'])
    except (ValueError, KeyError):
        return jsonify({'status': 'error', 'message': 'Invalid position data'}), 400

    # ユーザーの位置情報を更新
    user_positions[user_id] = {
        'x': x,
        'y': y,
        'z': z,
        'color': session.get('user_color', '#FFFFFF'),  # ユーザーの色を取得
        'last_update': time.time()
    }
    return jsonify({'status': 'success'})

# ユーザーの位置情報を取得するAPI (変更)
@app.route('/api/positions', methods=['GET'])
def get_positions():
    # 一定時間経過したユーザーを削除 (タイムアウトを120秒に変更)
    current_time = time.time()
    global user_positions
    user_positions = {
        k: v for k, v in user_positions.items() if current_time - v['last_update'] < 120
    }

    # ユーザーごとの色情報を追加
    positions_with_color = {
        user_id: {
            'x': pos['x'],
            'y': pos['y'],
            'z': pos['z'],
            'color': pos.get('color', '#FFFFFF')  # 色情報を追加（存在しない場合はデフォルトの白）
        } for user_id, pos in user_positions.items()
    }
    return jsonify(positions_with_color)

# セッションからユーザーIDと色を取得
@app.route('/api/session', methods=['GET'])
def get_session_data():
    user_id = session.get('user_id')
    user_color = session.get('user_color')

    if user_id is None:
        return jsonify({'status': 'error', 'message': 'User not logged in'}), 401

    return jsonify({'user_id': user_id, 'color': user_color})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
