#!/bin/bash

curl -v -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test101","password":"password123"}'