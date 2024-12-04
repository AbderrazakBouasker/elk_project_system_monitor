document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadedFiles = document.getElementById('uploadedFiles');
    const uploadButton = document.getElementById('uploadButton');
    
    // Store uploaded files
    const files = new Map();
    const uploadedFilesSet = new Set(); // Add this to track uploaded files

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
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
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
        
        for (const [fileName, file] of files) {
            const fileElement = uploadedFiles.querySelector(`li[data-filename="${fileName}"]`);
            if (fileElement) {
                const statusElement = fileElement.querySelector('.upload-status');
                statusElement.textContent = 'Uploading...';
            }
            
            await uploadFile(file);
        }
        
        updateUploadButtonState();
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