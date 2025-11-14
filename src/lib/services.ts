import { supabase } from './supabase';

export const authService = {
  // Registro de novo usuário
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });
    return { data, error };
  },

  // Login
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Obter usuário atual
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Atualizar perfil
  async updateProfile(userId: string, updates: { username?: string; avatar_url?: string; bio?: string }) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);
    return { data, error };
  },
};

export const postsService = {
  // Criar post
  async createPost(post: {
    user_id: string;
    content: string;
    image_url?: string;
    hashtags: string[];
    category: string;
  }) {
    const { data, error } = await supabase
      .from('posts')
      .insert([post])
      .select('*, user:users(*)');
    return { data, error };
  },

  // Buscar posts
  async getPosts(filters?: { category?: string; hashtag?: string }) {
    let query = supabase
      .from('posts')
      .select('*, user:users(*)')
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.hashtag) {
      query = query.contains('hashtags', [filters.hashtag]);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Curtir post
  async likePost(postId: string) {
    const { data, error } = await supabase.rpc('increment_likes', {
      post_id: postId,
    });
    return { data, error };
  },

  // Adicionar comentário
  async addComment(comment: { post_id: string; user_id: string; content: string }) {
    const { data, error } = await supabase
      .from('comments')
      .insert([comment])
      .select('*, user:users(*)');
    return { data, error };
  },

  // Buscar comentários
  async getComments(postId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:users(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    return { data, error };
  },
};

export const pollsService = {
  // Criar enquete
  async createPoll(poll: {
    user_id: string;
    question: string;
    options: { text: string }[];
    category: string;
    hashtags: string[];
  }) {
    const { data, error } = await supabase
      .from('polls')
      .insert([poll])
      .select('*, user:users(*)');
    return { data, error };
  },

  // Buscar enquetes
  async getPolls(filters?: { category?: string }) {
    let query = supabase
      .from('polls')
      .select('*, user:users(*)')
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Votar em enquete
  async vote(pollId: string, optionId: string, userId: string) {
    const { data, error } = await supabase.rpc('vote_poll', {
      poll_id: pollId,
      option_id: optionId,
      user_id: userId,
    });
    return { data, error };
  },
};
