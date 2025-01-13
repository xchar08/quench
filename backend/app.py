# backend/app.py
from flask import Flask, jsonify
import asyncio
from modal_deploy import main
from dotenv import load_dotenv
import os
from flask_cors import CORS

load_dotenv()  # Load environment variables from .env

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route("/api/optimal-deployment")
def optimal_deployment():
    try:
        result = asyncio.run(main())
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
