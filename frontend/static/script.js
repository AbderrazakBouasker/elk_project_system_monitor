document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadedFiles = document.getElementById('uploadedFiles');
    const uploadButton = document.getElementById('uploadButton');
    
    // Store uploaded files
    const files = new Map();
    const uploadedFilesSet = new Set(); // Add this to track uploaded files

    const validSubfolders = ['auth', 'history', 'sysd', 'syslog'];
    const fileList = new Map();

    function isValidFilename(filename) {
        return validSubfolders.some(subfolder => filename.toLowerCase().includes(subfolder));
    }

    function updateUploadButton() {
        const hasInvalidFiles = Array.from(fileList.values()).some(file => !file.isValid);
        uploadButton.disabled = hasInvalidFiles;
    }

    function addFileToList(file) {
        const isValid = isValidFilename(file.name);
        fileList.set(file.name, { file, isValid });
        
        const li = document.createElement('li');
        li.className = isValid ? 'valid-file' : 'invalid-file';
        
        const fileInfo = document.createElement('span');
        fileInfo.textContent = file.name;
        
        if (!isValid) {
            fileInfo.style.color = 'red';
            const errorMsg = document.createElement('span');
            errorMsg.textContent = ' - Invalid filename: must contain auth, history, sysd, or syslog';
            errorMsg.style.color = 'red';
            fileInfo.appendChild(errorMsg);
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => {
            fileList.delete(file.name);
            li.remove();
            updateUploadButton();
        };
        
        li.appendChild(fileInfo);
        li.appendChild(removeBtn);
        uploadedFiles.appendChild(li);
        updateUploadButton();
    }

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        Array.from(e.dataTransfer.files).forEach(addFileToList);
    });

    fileInput.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(addFileToList);
    });

    async function handleFiles(fileList) {
        for (const file of fileList) {
            if (!files.has(file.name)) {
                files.set(file.name, file);
                displayFile(file);
            }
        }
        updateUploadButtonState();
    }

    function updateUploadButtonState() {
        const hasUnuploadedFiles = Array.from(files.keys()).some(filename => !uploadedFilesSet.has(filename));
        uploadButton.disabled = files.size === 0 || !hasUnuploadedFiles;
    }

    uploadButton.addEventListener('click', async () => {
        uploadButton.disabled = true;
        
        const validFiles = Array.from(fileList.values())
            .filter(item => item.isValid)
            .map(item => item.file);
        
        const formData = new FormData();
        validFiles.forEach(file => formData.append('files[]', file));
        
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            // Handle response
            if (result.message) {
                alert(result.message);
                uploadedFiles.innerHTML = '';
                fileList.clear();
                updateUploadButton();
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed');
        }
    });

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('files[]', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (response.ok) {
                // Update UI to show success
                const fileElement = uploadedFiles.querySelector(`li[data-filename="${file.name}"]`);
                if (fileElement) {
                    fileElement.style.backgroundColor = '#d4edda';
                    const statusElement = fileElement.querySelector('.upload-status');
                    statusElement.textContent = 'Uploaded';
                }
                uploadedFilesSet.add(file.name); // Add file to uploaded set
                updateUploadButtonState();
            } else {
                console.error('Upload failed:', result.error);
                // Update UI to show error
                const fileElement = uploadedFiles.querySelector(`li[data-filename="${file.name}"]`);
                if (fileElement) {
                    fileElement.style.backgroundColor = '#f8d7da';
                    const statusElement = fileElement.querySelector('.upload-status');
                    statusElement.textContent = 'Failed';
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            const fileElement = uploadedFiles.querySelector(`li[data-filename="${file.name}"]`);
            if (fileElement) {
                const statusElement = fileElement.querySelector('.upload-status');
                statusElement.textContent = 'Error';
            }
        }
    }

    function displayFile(file) {
        const li = document.createElement('li');
        li.setAttribute('data-filename', file.name);
        li.innerHTML = `
            ${file.name} (${formatFileSize(file.size)})
            <div>
                <span class="upload-status">Pending</span>
                <button onclick="removeFile('${file.name}')">Remove</button>
            </div>
        `;
        uploadedFiles.appendChild(li);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Make removeFile function global
    window.removeFile = (fileName) => {
        files.delete(fileName);
        uploadedFilesSet.delete(fileName); // Remove from uploaded set
        renderFileList();
        updateUploadButtonState();
    };

    function renderFileList() {
        uploadedFiles.innerHTML = '';
        files.forEach(file => displayFile(file));
    }
});