# File: Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ .
ENV REDERIVE_DB=/data/memory.db
EXPOSE 8080
CMD ["uvicorn", "rederive.server:app", "--host", "0.0.0.0", "--port", "8080"]
