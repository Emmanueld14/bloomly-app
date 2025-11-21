/**
 * Supabase Client Helper Functions
 * Provides authentication and CRUD operations for Bloomly app
 */

// Initialize Supabase client
let supabaseClient = null;

function initSupabase() {
    if (window.supabase) {
        // Supabase already loaded
        const supabaseUrl = window.SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseAnonKey = window.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
        
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Supabase URL and Anon Key must be set. Check your environment variables.');
            return null;
        }
        
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        return supabaseClient;
    } else {
        console.error('Supabase JS library not loaded. Make sure @supabase/supabase-js is included.');
        return null;
    }
}

// Get Supabase client instance
function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = initSupabase();
    }
    return supabaseClient;
}

// ========== AUTHENTICATION ==========

/**
 * Sign up a new user
 */
async function signUp(email, password, name = null) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name || email.split('@')[0],
                    role: 'user'
                }
            }
        });
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Sign up error:', error);
        return { data: null, error };
    }
}

/**
 * Sign in an existing user
 */
async function signIn(email, password) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Sign in error:', error);
        return { data: null, error };
    }
}

/**
 * Sign out current user
 */
async function signOut() {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Sign out error:', error);
        return { error };
    }
}

/**
 * Get current user
 */
function getCurrentUser() {
    const supabase = getSupabase();
    if (!supabase) return null;
    return supabase.auth.getUser().then(({ data, error }) => {
        if (error) return null;
        return data.user;
    });
}

/**
 * Get current session
 */
function getCurrentSession() {
    const supabase = getSupabase();
    if (!supabase) return null;
    return supabase.auth.getSession().then(({ data, error }) => {
        if (error) return null;
        return data.session;
    });
}

/**
 * Listen to auth state changes
 */
function onAuthStateChange(callback) {
    const supabase = getSupabase();
    if (!supabase) return null;
    
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// ========== PROFILES ==========

/**
 * Get user profile
 */
async function getProfile(userId = null) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data: { user } } = await supabase.auth.getUser();
        const targetUserId = userId || user?.id;
        
        if (!targetUserId) throw new Error('No user ID provided');
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get profile error:', error);
        return { data: null, error };
    }
}

/**
 * Update user profile
 */
async function updateProfile(updates) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Update profile error:', error);
        return { data: null, error };
    }
}

// ========== NOTES (JOURNAL ENTRIES) ==========

/**
 * Get all notes for current user
 */
async function getNotes(limit = 50, offset = 0) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('inserted_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get notes error:', error);
        return { data: null, error };
    }
}

/**
 * Get a single note by ID
 */
async function getNote(noteId) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', noteId)
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get note error:', error);
        return { data: null, error };
    }
}

/**
 * Create a new note
 */
async function createNote(note) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data, error } = await supabase
            .from('notes')
            .insert({
                user_id: user.id,
                title: note.title,
                content: note.content,
                mood: note.mood || null,
                tags: note.tags || [],
                is_private: note.isPrivate !== undefined ? note.isPrivate : true,
                is_favorite: note.isFavorite !== undefined ? note.isFavorite : false
            })
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Create note error:', error);
        return { data: null, error };
    }
}

/**
 * Update a note
 */
async function updateNote(noteId, updates) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('notes')
            .update({
                title: updates.title,
                content: updates.content,
                mood: updates.mood,
                tags: updates.tags,
                is_private: updates.isPrivate,
                is_favorite: updates.isFavorite
            })
            .eq('id', noteId)
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Update note error:', error);
        return { data: null, error };
    }
}

/**
 * Delete a note
 */
async function deleteNote(noteId) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);
        
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Delete note error:', error);
        return { error };
    }
}

// ========== MOODS ==========

/**
 * Get moods for current user
 */
async function getMoods(limit = 100) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('moods')
            .select('*')
            .order('date', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get moods error:', error);
        return { data: null, error };
    }
}

/**
 * Create a mood entry
 */
async function createMood(mood) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data, error } = await supabase
            .from('moods')
            .insert({
                user_id: user.id,
                mood: mood.mood,
                notes: mood.notes || null,
                date: mood.date || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Create mood error:', error);
        return { data: null, error };
    }
}

// ========== ARTICLES ==========

/**
 * Get all published articles
 */
async function getArticles(limit = 50) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get articles error:', error);
        return { data: null, error };
    }
}

/**
 * Get a single article by ID
 */
async function getArticle(articleId) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', articleId)
            .eq('published', true)
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get article error:', error);
        return { data: null, error };
    }
}

// ========== CHAT MESSAGES ==========

/**
 * Get chat messages for current user
 */
async function getChatMessages(limit = 100) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .order('timestamp', { ascending: true })
            .limit(limit);
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get chat messages error:', error);
        return { data: null, error };
    }
}

/**
 * Create a chat message
 */
async function createChatMessage(message) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                user_id: user.id,
                text: message.text,
                sender: message.sender,
                timestamp: message.timestamp || Date.now()
            })
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Create chat message error:', error);
        return { data: null, error };
    }
}

// ========== DAILY CHECK-INS ==========

/**
 * Get daily check-ins for current user
 */
async function getDailyCheckIns(type = null, limit = 30) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        let query = supabase
            .from('daily_check_ins')
            .select('*')
            .order('date', { ascending: false })
            .limit(limit);
        
        if (type) {
            query = query.eq('type', type);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get daily check-ins error:', error);
        return { data: null, error };
    }
}

/**
 * Create or update a daily check-in
 */
async function saveDailyCheckIn(type, responses) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const today = new Date().toISOString().split('T')[0];
        
        // Use upsert to create or update
        const { data, error } = await supabase
            .from('daily_check_ins')
            .upsert({
                user_id: user.id,
                type: type,
                responses: responses,
                date: today
            }, {
                onConflict: 'user_id,type,date'
            })
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Save daily check-in error:', error);
        return { data: null, error };
    }
}

// ========== HABITS ==========

/**
 * Get habits for current user
 */
async function getHabits() {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('habits')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get habits error:', error);
        return { data: null, error };
    }
}

/**
 * Create a habit
 */
async function createHabit(habit) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data, error } = await supabase
            .from('habits')
            .insert({
                user_id: user.id,
                name: habit.name,
                description: habit.description || null,
                streak: habit.streak || 0
            })
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Create habit error:', error);
        return { data: null, error };
    }
}

// ========== SLEEP TRACKING ==========

/**
 * Get sleep tracking data for current user
 */
async function getSleepTracking(limit = 30) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('sleep_tracking')
            .select('*')
            .order('date', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get sleep tracking error:', error);
        return { data: null, error };
    }
}

/**
 * Create or update sleep tracking entry
 */
async function saveSleepTracking(sleep) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const date = sleep.date || new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('sleep_tracking')
            .upsert({
                user_id: user.id,
                hours: sleep.hours,
                quality: sleep.quality || null,
                date: date,
                notes: sleep.notes || null
            }, {
                onConflict: 'user_id,date'
            })
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Save sleep tracking error:', error);
        return { data: null, error };
    }
}

// ========== GOALS ==========

/**
 * Get goals for current user
 */
async function getGoals() {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('goals')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Get goals error:', error);
        return { data: null, error };
    }
}

/**
 * Create a goal
 */
async function createGoal(goal) {
    try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data, error } = await supabase
            .from('goals')
            .insert({
                user_id: user.id,
                title: goal.title,
                description: goal.description || null,
                category: goal.category || null,
                target_date: goal.targetDate || null
            })
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Create goal error:', error);
        return { data: null, error };
    }
}

// Export functions for use in other scripts
window.SupabaseClient = {
    init: initSupabase,
    getClient: getSupabase,
    // Auth
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getCurrentSession,
    onAuthStateChange,
    // Profiles
    getProfile,
    updateProfile,
    // Notes
    getNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    // Moods
    getMoods,
    createMood,
    // Articles
    getArticles,
    getArticle,
    // Chat
    getChatMessages,
    createChatMessage,
    // Check-ins
    getDailyCheckIns,
    saveDailyCheckIn,
    // Habits
    getHabits,
    createHabit,
    // Sleep
    getSleepTracking,
    saveSleepTracking,
    // Goals
    getGoals,
    createGoal
};

