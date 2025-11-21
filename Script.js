// Admin credentials
const ADMIN_CREDENTIALS = {
    email: 'admin@bloomly.co.ke',
    password: 'bloomly2024'
};

// Enhanced Blog Manager Component with Authentication
function BlogManager({ isAdmin = false }) {
    const [blogPosts, setBlogPosts] = React.useState(storage.get('blogPosts', initialBlogPosts));
    const [currentUser, setCurrentUser] = React.useState(storage.get('bloomly_current_user', null));
    const [showEditor, setShowEditor] = React.useState(false);
    const [showLogin, setShowLogin] = React.useState(false);
    const [loginError, setLoginError] = React.useState('');
    const [editingPost, setEditingPost] = React.useState(null);
    const [newPost, setNewPost] = React.useState({
        title: '',
        excerpt: '',
        content: '',
        author: '',
        category: 'Wellness',
        tags: '',
        published: true
    });

    // Save to localStorage whenever state changes
    React.useEffect(() => {
        storage.set('blogPosts', blogPosts);
    }, [blogPosts]);

    React.useEffect(() => {
        storage.set('bloomly_current_user', currentUser);
    }, [currentUser]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewPost(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const postData = {
            ...newPost,
            tags: newPost.tags.split(',').map(tag => tag.trim()),
            id: editingPost ? editingPost.id : Date.now(),
            date: editingPost ? editingPost.date : new Date().toISOString().split('T')[0],
            readTime: '3 min read'
        };

        if (editingPost) {
            setBlogPosts(prev => prev.map(post => 
                post.id === editingPost.id ? { ...post, ...postData } : post
            ));
        } else {
            setBlogPosts(prev => [postData, ...prev]);
        }

        setShowEditor(false);
        setEditingPost(null);
        setNewPost({
            title: '',
            excerpt: '',
            content: '',
            author: '',
            category: 'Wellness',
            tags: '',
            published: true
        });
    };

    const handleEdit = (post) => {
        setEditingPost(post);
        setNewPost({
            ...post,
            tags: Array.isArray(post.tags) ? post.tags.join(', ') : post.tags
        });
        setShowEditor(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            setBlogPosts(prev => prev.filter(post => post.id !== id));
        }
    };

    const handleLogin = (email, password) => {
        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            const user = { email, role: 'admin' };
            setCurrentUser(user);
            setShowLogin(false);
            setLoginError('');
            return true;
        }
        setLoginError('Invalid email or password');
        return false;
    };

    const handleLogout = () => {
        setCurrentUser(null);
    };

    const handleLoginSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        handleLogin(email, password);
    };

    // Login Modal
    if (showLogin) {
        return React.createElement('div', { 
            className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4' 
        },
            React.createElement('div', { className: 'bg-white rounded-2xl p-6 w-full max-w-md' },
                React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                    React.createElement('h2', { className: 'text-2xl font-bold' }, 'Admin Login'),
                    React.createElement('button', {
                        onClick: () => setShowLogin(false),
                        className: 'text-gray-500 hover:text-gray-700'
                    }, React.createElement('i', { className: 'fas fa-times' }))
                ),
                React.createElement('form', { onSubmit: handleLoginSubmit, className: 'space-y-4' },
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Email'),
                        React.createElement('input', {
                            type: 'email',
                            name: 'email',
                            required: true,
                            className: 'w-full p-3 border border-gray-300 rounded-lg',
                            placeholder: 'admin@bloomly.co.ke',
                            defaultValue: 'admin@bloomly.co.ke'
                        })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Password'),
                        React.createElement('input', {
                            type: 'password',
                            name: 'password',
                            required: true,
                            className: 'w-full p-3 border border-gray-300 rounded-lg',
                            placeholder: 'Enter password',
                            defaultValue: 'bloomly2024'
                        })
                    ),
                    loginError && React.createElement('p', { className: 'text-red-600 text-sm' }, loginError),
                    React.createElement('button', {
                        type: 'submit',
                        className: 'w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold'
                    }, 'Login')
                )
            )
        );
    }

    // Blog Editor
    if (showEditor) {
        return React.createElement('div', { className: 'max-w-4xl mx-auto bg-white rounded-2xl p-6 shadow-lg' },
            React.createElement('h2', { className: 'text-2xl font-bold mb-6' },
                editingPost ? 'Edit Blog Post' : 'Create New Blog Post'
            ),
            React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Title'),
                    React.createElement('input', {
                        type: 'text',
                        name: 'title',
                        value: newPost.title,
                        onChange: handleInputChange,
                        className: 'w-full p-3 border border-gray-300 rounded-lg',
                        required: true
                    })
                ),
                
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Excerpt'),
                    React.createElement('textarea', {
                        name: 'excerpt',
                        value: newPost.excerpt,
                        onChange: handleInputChange,
                        className: 'w-full h-20 p-3 border border-gray-300 rounded-lg',
                        required: true
                    })
                ),
                
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Content'),
                    React.createElement('textarea', {
                        name: 'content',
                        value: newPost.content,
                        onChange: handleInputChange,
                        className: 'w-full h-64 p-3 border border-gray-300 rounded-lg',
                        required: true
                    })
                ),
                
                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Author'),
                        React.createElement('input', {
                            type: 'text',
                            name: 'author',
                            value: newPost.author,
                            onChange: handleInputChange,
                            className: 'w-full p-3 border border-gray-300 rounded-lg',
                            required: true
                        })
                    ),
                    
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Category'),
                        React.createElement('select', {
                            name: 'category',
                            value: newPost.category,
                            onChange: handleInputChange,
                            className: 'w-full p-3 border border-gray-300 rounded-lg'
                        },
                            ['Wellness', 'Mindfulness', 'Anxiety', 'Self-Care', 'Mental Health'].map(category => 
                                React.createElement('option', { key: category, value: category }, category)
                            )
                        )
                    )
                ),
                
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Tags (comma separated)'),
                    React.createElement('input', {
                        type: 'text',
                        name: 'tags',
                        value: newPost.tags,
                        onChange: handleInputChange,
                        className: 'w-full p-3 border border-gray-300 rounded-lg',
                        placeholder: 'mindfulness, stress, wellness'
                    })
                ),
                
                React.createElement('div', { className: 'flex items-center' },
                    React.createElement('label', { className: 'flex items-center' },
                        React.createElement('input', {
                            type: 'checkbox',
                            name: 'published',
                            checked: newPost.published,
                            onChange: handleInputChange,
                            className: 'rounded h-5 w-5 text-blue-600 mr-2'
                        }),
                        'Published'
                    )
                ),
                
                React.createElement('div', { className: 'flex justify-end space-x-4' },
                    React.createElement('button', {
                        type: 'button',
                        onClick: () => {
                            setShowEditor(false);
                            setEditingPost(null);
                        },
                        className: 'px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold'
                    }, 'Cancel'),
                    React.createElement('button', {
                        type: 'submit',
                        className: 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold'
                    }, editingPost ? 'Update Post' : 'Create Post')
                )
            )
        );
    }

    return React.createElement('div', null,
        // Admin Panel
        currentUser && React.createElement('div', { className: 'admin-panel mb-8' },
            React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                React.createElement('h2', { className: 'text-2xl font-bold' }, 'Blog Management'),
                React.createElement('div', { className: 'flex gap-4 items-center' },
                    React.createElement('span', { className: 'text-gray-600' }, `Welcome, ${currentUser.email}`),
                    React.createElement('button', {
                        onClick: handleLogout,
                        className: 'px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-semibold'
                    }, 'Logout')
                )
            ),
            React.createElement('div', { className: 'flex gap-4' },
                React.createElement('button', {
                    onClick: () => setShowEditor(true),
                    className: 'admin-btn flex items-center font-semibold'
                },
                    React.createElement('i', { className: 'fas fa-plus mr-2' }),
                    'New Post'
                )
            )
        ),

        // Login Prompt for non-admin users trying to access admin features
        (!currentUser && isAdmin) && React.createElement('div', { className: 'admin-panel mb-8 text-center' },
            React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Admin Access Required'),
            React.createElement('p', { className: 'text-gray-600 mb-4' }, 'Please login to manage blog posts'),
            React.createElement('button', {
                onClick: () => setShowLogin(true),
                className: 'admin-btn font-semibold'
            }, 'Admin Login')
        ),

        // Blog Posts Grid
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' },
            blogPosts
                .filter(post => !isAdmin || currentUser ? true : post.published)
                .map(post =>
                    React.createElement('div', { key: post.id, className: 'blog-post' },
                        React.createElement('div', { className: 'h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center' },
                            React.createElement('i', { className: 'fas fa-feather text-4xl text-blue-600 opacity-50' })
                        ),
                        React.createElement('div', { className: 'p-6' },
                            React.createElement('div', { className: 'flex justify-between items-start mb-2' },
                                React.createElement('span', { className: 'bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold' },
                                    post.category
                                ),
                                React.createElement('span', { className: 'text-gray-500 text-sm' }, post.readTime)
                            ),
                            React.createElement('h3', { className: 'text-xl font-semibold text-gray-800 mb-2' }, post.title),
                            React.createElement('p', { className: 'text-gray-600 mb-4' }, post.excerpt),
                            React.createElement('div', { className: 'flex justify-between items-center' },
                                React.createElement('div', null,
                                    React.createElement('p', { className: 'text-sm text-gray-500' }, post.author),
                                    React.createElement('p', { className: 'text-xs text-gray-400' }, post.date)
                                ),
                                (currentUser || isAdmin) && React.createElement('div', { className: 'flex space-x-2' },
                                    React.createElement('button', {
                                        onClick: () => handleEdit(post),
                                        className: 'text-blue-600 hover:text-blue-800 text-lg'
                                    }, React.createElement('i', { className: 'fas fa-edit' })),
                                    React.createElement('button', {
                                        onClick: () => handleDelete(post.id),
                                        className: 'text-red-600 hover:text-red-800 text-lg'
                                    }, React.createElement('i', { className: 'fas fa-trash' }))
                                )
                            )
                        )
                    )
                )
        ),

        // Empty state
        blogPosts.length === 0 && React.createElement('div', { className: 'text-center py-12' },
            React.createElement('i', { className: 'fas fa-feather text-4xl text-gray-400 mb-4' }),
            React.createElement('h3', { className: 'text-xl font-semibold text-gray-600 mb-2' }, 'No blog posts yet'),
            React.createElement('p', { className: 'text-gray-500' }, currentUser ? 'Create your first blog post!' : 'Check back soon for new content')
        )
    );
}

// Enhanced Blog Page with Search
function BlogPage({ isAdmin }) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [blogPosts] = React.useState(storage.get('blogPosts', initialBlogPosts));
    
    const filteredPosts = blogPosts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(post.tags) && post.tags.some(tag => 
            tag.toLowerCase().includes(searchTerm.toLowerCase())
        ))
    );

    return React.createElement('div', { className: 'pt-32 pb-16' },
        React.createElement('div', { className: 'container mx-auto px-4' },
            React.createElement('h1', { className: 'text-4xl font-bold text-center mb-8' }, 'Bloomly Blog'),
            React.createElement('p', { className: 'text-xl text-center text-gray-600 mb-12' },
                'Expert insights and practical tips for your mental wellness journey'
            ),
            
            // Search Bar
            React.createElement('div', { className: 'max-w-2xl mx-auto mb-8' },
                React.createElement('div', { className: 'relative' },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Search blog posts...',
                        value: searchTerm,
                        onChange: (e) => setSearchTerm(e.target.value),
                        className: 'w-full p-4 pl-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500'
                    }),
                    React.createElement('i', { 
                        className: 'fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400' 
                    })
                )
            ),
            
            // Search Results Info
            searchTerm && React.createElement('div', { className: 'text-center mb-6' },
                React.createElement('p', { className: 'text-gray-600' },
                    `Found ${filteredPosts.length} post${filteredPosts.length !== 1 ? 's' : ''} matching "${searchTerm}"`
                )
            ),
            
            React.createElement(BlogManager, { isAdmin: isAdmin })
        )
    );
}

// Enhanced Header with Admin Status
function Header({ currentPage, onNavigate, onToggleSidebar }) {
    const [scrolled, setScrolled] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(storage.get('bloomly_current_user', null));
    
    React.useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    const navItems = [
        { key: 'home', label: 'Home' },
        { key: 'explore', label: 'Explore' },
        { key: 'blog', label: 'Blog' },
        { key: 'community', label: 'Community' },
        { key: 'resources', label: 'Resources' },
        { key: 'about', label: 'About' }
    ];

    const handleLogout = () => {
        setCurrentUser(null);
        storage.set('bloomly_current_user', null);
    };

    return React.createElement('header', {
        className: `fixed w-full z-50 transition-all duration-300 ${scrolled ? 'py-3 bg-blue-800 bg-opacity-95' : 'py-5 bg-blue-700 bg-opacity-90'}`
    },
        React.createElement('div', { className: 'container mx-auto px-4' },
            React.createElement('div', { className: 'flex justify-between items-center' },
                React.createElement('div', { className: 'flex items-center' },
                    React.createElement('button', {
                        className: 'text-white mr-4 text-xl lg:hidden',
                        onClick: onToggleSidebar
                    }, React.createElement('i', { className: 'fas fa-bars' })),
                    React.createElement('div', {
                        className: 'logo text-3xl text-white cursor-pointer',
                        onClick: () => onNavigate('home')
                    }, 'Bloomly')
                ),
                
                React.createElement('nav', { className: 'hidden lg:block' },
                    React.createElement('ul', { className: 'flex space-x-6' },
                        navItems.map(item => 
                            React.createElement('li', { key: item.key },
                                React.createElement('button', {
                                    className: `text-white font-semibold hover:text-blue-200 transition-colors duration-300 px-3 py-1 ${currentPage === item.key ? 'text-blue-200' : ''}`,
                                    onClick: () => onNavigate(item.key)
                                }, item.label)
                            )
                        )
                    )
                ),
                
                React.createElement('div', { className: 'flex items-center space-x-4' },
                    currentUser ? (
                        React.createElement('div', { className: 'flex items-center space-x-4' },
                            React.createElement('span', { className: 'text-white text-sm font-semibold' }, `Admin`),
                            React.createElement('button', {
                                onClick: handleLogout,
                                className: 'bg-white text-blue-700 px-4 py-2 rounded-full font-semibold hover:bg-blue-100 transition-colors duration-300'
                            }, 'Logout')
                        )
                    ) : (
                        React.createElement('button', {
                            className: 'bg-white text-blue-700 px-4 py-2 rounded-full font-semibold hover:bg-blue-100 transition-colors duration-300'
                        }, 'Login')
                    )
                )
            )
        )
    );
}

// Enhanced App Component
function App() {
    const [currentPage, setCurrentPage] = React.useState('home');
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(storage.get('bloomly_current_user', null));

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    const renderCurrentPage = () => {
        const pages = {
            home: HomePage,
            blog: () => React.createElement(BlogPage, { isAdmin: isAdmin || currentUser }),
            explore: () => React.createElement(SimplePage, { title: 'Explore', description: 'Discover wellness resources and tools' }),
            community: () => React.createElement(SimplePage, { title: 'Community', description: 'Connect with others on similar journeys' }),
            resources: () => React.createElement(SimplePage, { title: 'Resources', description: 'Helpful materials and support information' }),
            about: () => React.createElement(SimplePage, { title: 'About Bloomly', description: 'Learn about our mission and values' })
        };
        
        const PageComponent = pages[currentPage] || HomePage;
        return React.createElement(PageComponent);
    };

    return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
        React.createElement(Header, {
            currentPage: currentPage,
            onNavigate: setCurrentPage,
            onToggleSidebar: toggleSidebar
        }),
        
        React.createElement(Sidebar, {
            isOpen: sidebarOpen,
            onClose: closeSidebar,
            currentPage: currentPage,
            onNavigate: setCurrentPage
        }),
        
        React.createElement('div', { className: window.innerWidth >= 1025 ? 'main-content' : '' },
            renderCurrentPage()
        ),

        React.createElement(SupportChatbot),

        // Admin Mode Toggle (only show if not logged in)
        !currentUser && React.createElement('div', { className: 'fixed top-20 right-4 z-50' },
            React.createElement('button', {
                onClick: () => setIsAdmin(!isAdmin),
                className: `px-4 py-2 rounded-full text-sm font-semibold ${isAdmin ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`
            }, isAdmin ? 'Admin Mode ON' : 'Admin Mode OFF')
        ),

        // Admin Status Indicator (when logged in)
        currentUser && React.createElement('div', { className: 'fixed top-20 right-4 z-50' },
            React.createElement('div', { className: 'px-4 py-2 bg-green-600 text-white rounded-full text-sm font-semibold' },
                'Admin Logged In'
            )
        ),

        React.createElement('footer', { className: 'bg-gray-800 text-white py-12' },
            React.createElement('div', { className: 'container mx-auto px-4 text-center' },
                React.createElement('div', { className: 'logo text-2xl mb-4' }, 'Bloomly'),
                React.createElement('p', { className: 'text-gray-400 mb-4' }, 'Helping you flourish through practical self-help resources'),
                React.createElement('p', null, '© 2023 Bloomly. All rights reserved.')
            )
        )
    );
}

// Render the app (keep this at the end)
ReactDOM.render(React.createElement(App), document.getElementById('root'));