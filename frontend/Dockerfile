# Use Python 3.9 slim image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements file first (you'll need to create this)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY static/ static/
COPY templates/ templates/
COPY app.py .

# Environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV ELASTICSEARCH_HOST=elasticsearch
ENV ELASTICSEARCH_PORT=9200
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

# Expose port
EXPOSE 5050

# Command to run the application
CMD ["python", "app.py"]
