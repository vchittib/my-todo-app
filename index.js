const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false
    )
  `);
}

// Get all todos
app.get('/todos', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM todos ORDER BY id');
  res.json(rows);
});

// Get a single todo
app.get('/todos/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM todos WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Todo not found' });
  res.json(rows[0]);
});

// Create a todo
app.post('/todos', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const { rows } = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING *',
    [title]
  );
  res.status(201).json(rows[0]);
});

// Update a todo
app.put('/todos/:id', async (req, res) => {
  const { title, completed } = req.body;
  const { rows } = await pool.query(
    `UPDATE todos SET
      title = COALESCE($1, title),
      completed = COALESCE($2, completed)
     WHERE id = $3 RETURNING *`,
    [title ?? null, completed ?? null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Todo not found' });
  res.json(rows[0]);
});

// Delete a todo
app.delete('/todos/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Todo not found' });
  res.status(204).send();
});

init().then(() => {
  app.listen(PORT, () => console.log(`Todo app running at http://localhost:${PORT}`));
});
