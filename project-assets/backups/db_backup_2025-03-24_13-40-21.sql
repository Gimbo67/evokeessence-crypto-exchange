-- PostgreSQL database dump
CREATE TABLE users (id SERIAL PRIMARY KEY, username TEXT, password TEXT, isAdmin BOOLEAN);
INSERT INTO users VALUES (1, 'admin', 'password', true);
