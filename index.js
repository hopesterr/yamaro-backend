const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Route GET "/" à ajouter ici :
app.get("/", (req, res) => {
  res.send("✅ Backend Yamaro API is running.");
});

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token invalide' });
    }
};

// Route d'inscription
app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route de connexion
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route de déconnexion
app.post('/auth/logout', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route protégée pour obtenir les informations de l'utilisateur
app.get('/auth/me', authenticateToken, async (req, res) => {
    res.json(req.user);
});

// Routes
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/watched', async (req, res) => {
  try {
    const { user_id, movie_id, rating } = req.body;
    
    const { data, error } = await supabase
      .from('watched_movies')
      .insert([{ user_id, movie_id, rating }])
      .select();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes pour les notes des utilisateurs
app.get('/api/ratings/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('[GET /api/ratings/:userId] userId:', userId);
        const { data, error } = await supabase
            .from('ratings')
            .select('rating, movie_id')
            .eq('user_id', userId);
        console.log('[GET /api/ratings/:userId] data:', data, 'error:', error);
        if (error) throw error;
        res.json(data.map(item => ({
            movie_id: item.movie_id,
            rating: item.rating
        })));
    } catch (error) {
        console.error('[GET /api/ratings/:userId] error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ratings/:userId/:movieId', authenticateToken, async (req, res) => {
    try {
        const { userId, movieId } = req.params;
        console.log('[GET /api/ratings/:userId/:movieId] userId:', userId, 'movieId:', movieId);
        const { data, error } = await supabase
            .from('ratings')
            .select('rating')
            .eq('user_id', userId)
            .eq('movie_id', movieId)
            .single();
        console.log('[GET /api/ratings/:userId/:movieId] data:', data, 'error:', error);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('[GET /api/ratings/:userId/:movieId] error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ratings', authenticateToken, async (req, res) => {
    try {
        const { movie_id, rating, user_id } = req.body;
        console.log('[POST /api/ratings] body:', req.body);
        console.log('[POST /api/ratings] req.user.id:', req.user.id);
        // Vérifier si l'utilisateur est autorisé à modifier cette note
        if (req.user.id !== user_id) {
            console.warn('[POST /api/ratings] Non autorisé:', req.user.id, user_id);
            return res.status(403).json({ error: 'Non autorisé' });
        }
        const { data, error } = await supabase
            .from('ratings')
            .upsert([
                { user_id, movie_id, rating }
            ])
            .select();
        console.log('[POST /api/ratings] upsert data:', data, 'error:', error);
        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        console.error('[POST /api/ratings] error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 