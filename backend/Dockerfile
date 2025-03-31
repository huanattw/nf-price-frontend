FROM python:3.9-slim

WORKDIR /app

# Install dependencies
# Assuming your app uses Flask - update as needed for other frameworks
RUN pip install --no-cache-dir flask flask-cors requests

# Copy your application files
COPY main.py .
COPY final.json .


# Expose the port your app runs on
EXPOSE 5002

# Command to run the application
CMD ["python", "main.py"]
