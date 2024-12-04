from flask import Flask, render_template, request, jsonify
import os
import random

app = Flask(__name__)

# Configure upload folders
BASE_UPLOAD_FOLDER = '../logfiles'
SUBFOLDERS = ['auth', 'history', 'sysd', 'syslog']

# Create base folder and subfolders if they don't exist
if not os.path.exists(BASE_UPLOAD_FOLDER):
    os.makedirs(BASE_UPLOAD_FOLDER)

for subfolder in SUBFOLDERS:
    subfolder_path = os.path.join(BASE_UPLOAD_FOLDER, subfolder)
    if not os.path.exists(subfolder_path):
        os.makedirs(subfolder_path)

def get_subfolder(filename):
    filename_lower = filename.lower()
    for subfolder in SUBFOLDERS:
        if subfolder in filename_lower:
            return subfolder
    return ''  # Default to base folder if no match

def generate_unique_filename(original_filename):
    name, ext = os.path.splitext(original_filename)
    random_number = str(random.randint(10000, 99999))
    return f"{name}_{random_number}{ext}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sysdlog')
def sysdlog():
    return render_template('sysdlog.html')

@app.route('/syslog')
def syslog():
    return render_template('syslog.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files[]')
    uploaded_files = []
    
    for file in files:
        if file.filename:
            subfolder = get_subfolder(file.filename)
            new_filename = generate_unique_filename(file.filename)
            
            save_path = os.path.join(BASE_UPLOAD_FOLDER, subfolder) if subfolder else BASE_UPLOAD_FOLDER
            file.save(os.path.join(save_path, new_filename))
            
            uploaded_files.append({
                'original_name': file.filename,
                'saved_as': new_filename,
                'subfolder': subfolder if subfolder else 'root'
            })
    
    return jsonify({'message': 'Files uploaded successfully', 'files': uploaded_files})

if __name__ == '__main__':
    app.run(debug=True, port=5050, host='0.0.0.0')