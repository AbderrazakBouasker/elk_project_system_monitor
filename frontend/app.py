
from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = '../logfiles'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files[]')
    uploaded_files = []
    
    for file in files:
        if file.filename:
            file.save(os.path.join(UPLOAD_FOLDER, file.filename))
            uploaded_files.append(file.filename)
    
    return jsonify({'message': 'Files uploaded successfully', 'files': uploaded_files})

if __name__ == '__main__':
    app.run(debug=True, port=5050, host='0.0.0.0')