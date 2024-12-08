from flask import Flask, render_template, request, jsonify
import os, random, time
from datetime import datetime
from elasticsearch import Elasticsearch
import redis
import json
import hashlib
import logging

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
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_number = str(random.randint(10000, 99999))
    return f"{name}_{timestamp}-{random_number}{ext}"

# Initialize Elasticsearch client
es = Elasticsearch(hosts=["http://localhost:9200"])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis configuration
CACHE_EXPIRATION = 300  # 5 minutes
MAX_CACHE_SIZE = 1000  # Maximum number of cached queries
redis_client = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True,
    socket_timeout=2
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sysdlog')
def sysdlog():
    return render_template('sysdlog.html')

@app.route('/syslog')
def syslog():
    return render_template('syslog.html')

@app.route('/search', methods=['GET', 'POST'])
def search():
    if request.method == 'POST':
        start_time = time.time()
        query = request.form.get('query')
        log_type = request.form.get('log_type')

        cache_key = hashlib.md5(f"{query}:{log_type}".encode()).hexdigest()

        try:
            # Try to get from cache
            cached_data = redis_client.get(cache_key)
            if cached_data:
                results = json.loads(cached_data)
                field_names = results[0].keys() if results else []
                response_time = time.time() - start_time
                logger.info(f"Cache HIT - Query: {query} - Time: {response_time:.2f}s")
                return render_template('search.html', 
                                    results=results, 
                                    field_names=field_names,
                                    query=query, 
                                    log_type=log_type, 
                                    from_cache=True,
                                    response_time=f"{response_time:.2f}")

            # If not in cache, search Elasticsearch
            if log_type == "sysd":
                index_name = "sysd-index-*"
            elif log_type == "syslog":
                index_name = "syslog-*"
            elif log_type == "auth":
                index_name = "auth-*"
            elif log_type == "history":
                index_name = "apt-history-*"
            else:
                index_name = "*"

            search_body = {
                "query": {
                    "query_string": {
                        "query": query
                    }
                },
                "size": 100  # Limit results to prevent huge cache entries
            }

            res = es.search(index=index_name, body=search_body)
            hits = res['hits']['hits']
            results = [hit['_source'] for hit in hits]

            # Cache the results if not empty
            if results:
                try:
                    # Check cache size before adding new entry
                    if redis_client.dbsize() >= MAX_CACHE_SIZE:
                        # Remove oldest entry
                        oldest_key = redis_client.keys()[0]
                        redis_client.delete(oldest_key)

                    redis_client.setex(
                        cache_key,
                        CACHE_EXPIRATION,
                        json.dumps(results)
                    )
                except redis.RedisError as e:
                    logger.error(f"Redis caching error: {e}")

            field_names = results[0].keys() if results else []
            response_time = time.time() - start_time
            logger.info(f"Cache MISS - Query: {query} - Time: {response_time:.2f}s")

            return render_template('search.html', 
                                results=results, 
                                field_names=field_names,
                                query=query, 
                                log_type=log_type, 
                                from_cache=False,
                                response_time=f"{response_time:.2f}")

        except redis.RedisError as e:
            logger.error(f"Redis error: {e}")
            # Fallback to direct Elasticsearch query
            # ...existing elasticsearch query code...

        except Exception as e:
            logger.error(f"Search error: {e}")
            return render_template('search.html', error="Search failed. Please try again.")

    return render_template('search.html')

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