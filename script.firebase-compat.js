/**
 * Firebase to Supabase Compatibility Layer
 * Translates Firebase API calls to Supabase equivalents
 * This allows existing Firebase code to work with Supabase
 */

(function() {
    'use strict';
    
    if (!window.SupabaseClient) {
        console.error('SupabaseClient not found. Make sure script.supabase.js is loaded first.');
        return;
    }
    
    const supabase = window.SupabaseClient.getClient();
    if (!supabase) {
        console.error('Supabase client not initialized');
        return;
    }
    
    // Firebase Auth compatibility
    window.firebaseAuth = {
        currentUser: null,
        
        // Update current user from Supabase session
        async updateCurrentUser() {
            try {
                const user = await window.SupabaseClient.getCurrentUser();
                if (user) {
                    const { data: profile } = await window.SupabaseClient.getProfile(user.id);
                    this.currentUser = {
                        uid: user.id,
                        email: user.email,
                        displayName: profile?.name || user.email?.split('@')[0],
                        emailVerified: user.email_confirmed_at ? true : false
                    };
                    // Also sync to localStorage for backward compatibility
                    const storage = window.localStorage;
                    if (storage) {
                        storage.setItem('bloomly_current_user', JSON.stringify({
                            id: user.id,
                            email: user.email,
                            name: profile?.name || user.email?.split('@')[0],
                            role: profile?.role || 'user'
                        }));
                    }
                } else {
                    this.currentUser = null;
                    const storage = window.localStorage;
                    if (storage) {
                        storage.removeItem('bloomly_current_user');
                    }
                }
            } catch (error) {
                console.error('Error updating current user:', error);
                this.currentUser = null;
            }
            return this.currentUser;
        }
    };
    
    // Initialize current user
    window.firebaseAuth.updateCurrentUser();
    
    // Listen to auth changes and update currentUser
    const unsubscribe = window.SupabaseClient.onAuthStateChange((event, session) => {
        window.firebaseAuth.updateCurrentUser().then(() => {
            if (window.onAuthStateChangedCallback) {
                window.onAuthStateChangedCallback(window.firebaseAuth.currentUser);
            }
        });
    });
    
    // Store unsubscribe function
    window.firebaseAuthUnsubscribe = unsubscribe;
    
    // Firebase onAuthStateChanged compatibility
    window.onAuthStateChanged = function(auth, callback) {
        window.onAuthStateChangedCallback = callback;
        // Call immediately with current user
        window.firebaseAuth.updateCurrentUser().then(() => {
            callback(window.firebaseAuth.currentUser);
        });
        // Return unsubscribe function
        return () => {
            window.onAuthStateChangedCallback = null;
        };
    };
    
    // Firebase signOut compatibility
    window.firebaseSignOut = async function(auth) {
        return window.SupabaseClient.signOut();
    };
    
    // Firestore compatibility layer
    window.firebaseDb = {}; // Placeholder
    
    window.firestore = {
        collection: function(db, collectionName) {
            const ref = {
                _collection: collectionName,
                _db: db,
                _type: 'collection'
            };
            return ref;
        },
        
        query: function(collectionRef, ...constraints) {
            const queryRef = {
                _collection: collectionRef._collection,
                _db: collectionRef._db,
                _type: 'query',
                _constraints: constraints || []
            };
            return queryRef;
        },
        
        where: function(field, operator, value) {
            return {
                _type: 'where',
                field,
                operator,
                value
            };
        },
        
        orderBy: function(field, direction) {
            return {
                _type: 'orderBy',
                field,
                direction: direction || 'asc'
            };
        },
        
        limit: function(count) {
            return {
                _type: 'limit',
                count
            };
        },
        
        doc: function(db, collectionName, docId) {
            return {
                _collection: collectionName,
                _id: docId
            };
        },
        
        Timestamp: {
            now: function() {
                return {
                    toDate: () => new Date(),
                    toMillis: () => Date.now()
                };
            },
            fromDate: function(date) {
                return {
                    toDate: () => date,
                    toMillis: () => date.getTime()
                };
            }
        },
        
        addDoc: async function(collectionRef, data) {
            const collectionName = collectionRef._collection;
            const supabase = window.SupabaseClient.getClient();
            
            // Map collection names to Supabase functions
            const collectionMap = {
                'journals': 'createNote',
                'notes': 'createNote',
                'moods': 'createMood',
                'dailyCheckIns': 'saveDailyCheckIn',
                'articles': null, // Admin only
                'aiChats': 'createChatMessage',
                'chatMessages': 'createChatMessage'
            };
            
            const funcName = collectionMap[collectionName];
            if (funcName && window.SupabaseClient[funcName]) {
                // Transform data format
                let transformedData = data;
                if (collectionName === 'journals' || collectionName === 'notes') {
                    transformedData = {
                        title: data.title,
                        content: data.content,
                        mood: data.mood,
                        tags: data.tags || [],
                        isPrivate: data.isPrivate !== undefined ? data.isPrivate : true,
                        isFavorite: data.isFavorite !== undefined ? data.isFavorite : false
                    };
                } else if (collectionName === 'moods') {
                    transformedData = {
                        mood: data.mood,
                        notes: data.notes,
                        date: data.date
                    };
                } else if (collectionName === 'dailyCheckIns') {
                    transformedData = {
                        type: data.type,
                        responses: data.responses
                    };
                } else if (collectionName === 'aiChats' || collectionName === 'chatMessages') {
                    transformedData = {
                        text: data.text,
                        sender: data.sender,
                        timestamp: data.timestamp
                    };
                }
                
                const result = await window.SupabaseClient[funcName](transformedData);
                if (result.error) {
                    throw result.error;
                }
                return { id: result.data.id };
            }
            
            // Fallback: direct Supabase insert
            const { data: result, error } = await supabase
                .from(collectionName)
                .insert(data)
                .select()
                .single();
            
            if (error) throw error;
            return { id: result.id };
        },
        
        getDocs: async function(queryRef) {
            const collectionName = queryRef._collection;
            const supabase = window.SupabaseClient.getClient();
            
            // Map collection names to Supabase functions
            const collectionMap = {
                'journals': 'getNotes',
                'notes': 'getNotes',
                'moods': 'getMoods',
                'dailyCheckIns': 'getDailyCheckIns',
                'articles': 'getArticles',
                'aiChats': 'getChatMessages',
                'chatMessages': 'getChatMessages'
            };
            
            const funcName = collectionMap[collectionName];
            if (funcName && window.SupabaseClient[funcName]) {
                const result = await window.SupabaseClient[funcName]();
                if (result.error) {
                    throw result.error;
                }
                // Transform to Firestore-like format
                return {
                    forEach: function(callback) {
                        result.data.forEach(doc => {
                            callback({
                                id: doc.id,
                                data: () => doc
                            });
                        });
                    },
                    docs: result.data.map(doc => ({
                        id: doc.id,
                        data: () => doc
                    }))
                };
            }
            
            // Fallback: direct Supabase query
            let query = supabase.from(collectionName).select('*');
            
            // Apply constraints from queryRef
            if (queryRef._constraints) {
                queryRef._constraints.forEach(constraint => {
                    if (constraint._type === 'where') {
                        // Map Firestore operators to Supabase
                        if (constraint.operator === '==') {
                            query = query.eq(constraint.field, constraint.value);
                        } else if (constraint.operator === '!=') {
                            query = query.neq(constraint.field, constraint.value);
                        } else if (constraint.operator === '>') {
                            query = query.gt(constraint.field, constraint.value);
                        } else if (constraint.operator === '>=') {
                            query = query.gte(constraint.field, constraint.value);
                        } else if (constraint.operator === '<') {
                            query = query.lt(constraint.field, constraint.value);
                        } else if (constraint.operator === '<=') {
                            query = query.lte(constraint.field, constraint.value);
                        }
                    } else if (constraint._type === 'orderBy') {
                        query = query.order(constraint.field, { 
                            ascending: constraint.direction === 'asc' 
                        });
                    } else if (constraint._type === 'limit') {
                        query = query.limit(constraint.count);
                    }
                });
            }
            
            const { data, error } = await query;
            if (error) throw error;
            
            return {
                forEach: function(callback) {
                    if (data) {
                        data.forEach(doc => {
                            callback({
                                id: doc.id,
                                data: () => doc
                            });
                        });
                    }
                },
                docs: (data || []).map(doc => ({
                    id: doc.id,
                    data: () => doc
                }))
            };
        },
        
        getDoc: async function(docRef) {
            const collectionName = docRef._collection;
            const docId = docRef._id;
            const supabase = window.SupabaseClient.getClient();
            
            const { data, error } = await supabase
                .from(collectionName)
                .select('*')
                .eq('id', docId)
                .single();
            
            if (error) throw error;
            
            return {
                exists: () => !!data,
                id: data.id,
                data: () => data
            };
        },
        
        updateDoc: async function(docRef, updates) {
            const collectionName = docRef._collection;
            const docId = docRef._id;
            const supabase = window.SupabaseClient.getClient();
            
            const { error } = await supabase
                .from(collectionName)
                .update(updates)
                .eq('id', docId);
            
            if (error) throw error;
        },
        
        deleteDoc: async function(docRef) {
            const collectionName = docRef._collection;
            const docId = docRef._id;
            const supabase = window.SupabaseClient.getClient();
            
            const { error } = await supabase
                .from(collectionName)
                .delete()
                .eq('id', docId);
            
            if (error) throw error;
        },
        
        onSnapshot: function(queryRef, onNext, onError) {
            const collectionName = queryRef._collection;
            const supabase = window.SupabaseClient.getClient();
            
            // Build the query for real-time subscription
            let query = supabase.from(collectionName).select('*');
            
            // Apply constraints
            if (queryRef._constraints) {
                queryRef._constraints.forEach(constraint => {
                    if (constraint._type === 'where' && constraint.operator === '==') {
                        query = query.eq(constraint.field, constraint.value);
                    } else if (constraint._type === 'orderBy') {
                        query = query.order(constraint.field, { 
                            ascending: constraint.direction === 'asc' 
                        });
                    } else if (constraint._type === 'limit') {
                        query = query.limit(constraint.count);
                    }
                });
            }
            
            // Set up real-time subscription
            const channelName = `${collectionName}_${Date.now()}`;
            const channel = supabase
                .channel(channelName)
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: collectionName 
                    },
                    async (payload) => {
                        try {
                            // Fetch updated data with same query
                            const { data, error } = await query;
                            if (error) {
                                if (onError) onError(error);
                                return;
                            }
                            
                            // Transform to Firestore-like format
                            const snapshot = {
                                forEach: function(callback) {
                                    if (data) {
                                        data.forEach(doc => {
                                            callback({
                                                id: doc.id,
                                                data: () => doc
                                            });
                                        });
                                    }
                                },
                                docs: (data || []).map(doc => ({
                                    id: doc.id,
                                    data: () => doc
                                }))
                            };
                            
                            onNext(snapshot);
                        } catch (err) {
                            if (onError) onError(err);
                        }
                    }
                )
                .subscribe();
            
            // Initial fetch
            query.then(({ data, error }) => {
                if (error) {
                    if (onError) onError(error);
                    return;
                }
                
                const snapshot = {
                    forEach: function(callback) {
                        if (data) {
                            data.forEach(doc => {
                                callback({
                                    id: doc.id,
                                    data: () => doc
                                });
                            });
                        }
                    },
                    docs: (data || []).map(doc => ({
                        id: doc.id,
                        data: () => doc
                    }))
                };
                
                onNext(snapshot);
            }).catch(err => {
                if (onError) onError(err);
            });
            
            // Return unsubscribe function
            return () => {
                supabase.removeChannel(channel);
            };
        }
    };
    
    // Signal that Firebase compatibility layer is ready
    window.firebaseReady = true;
    window.dispatchEvent(new Event('firebaseReady'));
    
    console.log('Firebase compatibility layer initialized');
})();

