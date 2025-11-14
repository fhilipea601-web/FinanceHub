"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  User,
  LogOut,
  Plus,
  Image as ImageIcon,
  BarChart2,
  Hash,
  MessageCircle,
  Heart,
  Share2,
  Filter,
  Search,
  Users,
  Newspaper
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase, type Post, type Poll, type User as UserType } from "@/lib/supabase";
import { authService, postsService, pollsService } from "@/lib/services";

// Categorias disponíveis
const CATEGORIES = [
  { id: "acoes", label: "Ações", color: "bg-blue-500" },
  { id: "cripto", label: "Cripto", color: "bg-orange-500" },
  { id: "fundos", label: "Fundos", color: "bg-green-500" },
  { id: "economia", label: "Economia", color: "bg-purple-500" },
  { id: "mercados", label: "Mercados", color: "bg-pink-500" },
  { id: "analises", label: "Análises", color: "bg-cyan-500" },
];

export default function FinanceHub() {
  // Estados de autenticação
  const [user, setUser] = useState<UserType | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Estados de posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);

  // Estados de formulários
  const [postContent, setPostContent] = useState("");
  const [postHashtags, setPostHashtags] = useState("");
  const [postCategory, setPostCategory] = useState("acoes");
  const [postImage, setPostImage] = useState("");

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollCategory, setPollCategory] = useState("acoes");
  const [pollHashtags, setPollHashtags] = useState("");

  // Verificar autenticação ao carregar
  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setUser(null);
        }
        setIsCheckingAuth(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Carregar posts quando usuário estiver logado
  useEffect(() => {
    if (user) {
      loadPosts();
      loadPolls();
    }
  }, [user, selectedCategory]);

  const checkUser = async () => {
    setIsCheckingAuth(true);
    const currentUser = await authService.getCurrentUser();
    if (currentUser) {
      await loadUserData(currentUser.id);
    }
    setIsCheckingAuth(false);
  };

  const loadUserData = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setUser(data);
    }
  };

  const loadPosts = async () => {
    const filters = selectedCategory !== "all" ? { category: selectedCategory } : undefined;
    const { data, error } = await postsService.getPosts(filters);
    if (data) {
      setPosts(data);
    }
  };

  const loadPolls = async () => {
    const filters = selectedCategory !== "all" ? { category: selectedCategory } : undefined;
    const { data, error } = await pollsService.getPolls(filters);
    if (data) {
      setPolls(data);
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;

    try {
      if (authMode === "register") {
        const { data, error } = await authService.signUp(email, password, username);
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email.");
        setIsAuthOpen(false);
      } else {
        const { data, error } = await authService.signIn(email, password);
        if (error) throw error;
        
        // Carregar dados do usuário imediatamente após login
        if (data.user) {
          await loadUserData(data.user.id);
          toast.success("Login realizado com sucesso!");
          setIsAuthOpen(false);
        } else {
          throw new Error("Erro ao carregar dados do usuário");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao autenticar");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    setUser(null);
    toast.success("Logout realizado");
  };

  const handleCreatePost = async () => {
    if (!user || !postContent.trim()) return;

    const hashtags = postHashtags
      .split(" ")
      .filter(tag => tag.startsWith("#"))
      .map(tag => tag.slice(1));

    const { data, error } = await postsService.createPost({
      user_id: user.id,
      content: postContent,
      image_url: postImage || undefined,
      hashtags,
      category: postCategory,
    });

    if (error) {
      toast.error("Erro ao criar post");
      return;
    }

    toast.success("Post criado com sucesso!");
    setIsCreatePostOpen(false);
    setPostContent("");
    setPostHashtags("");
    setPostImage("");
    loadPosts();
  };

  const handleCreatePoll = async () => {
    if (!user || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      toast.error("Preencha a pergunta e pelo menos 2 opções");
      return;
    }

    const hashtags = pollHashtags
      .split(" ")
      .filter(tag => tag.startsWith("#"))
      .map(tag => tag.slice(1));

    const options = pollOptions
      .filter(o => o.trim())
      .map(text => ({ text }));

    const { data, error } = await pollsService.createPoll({
      user_id: user.id,
      question: pollQuestion,
      options,
      category: pollCategory,
      hashtags,
    });

    if (error) {
      toast.error("Erro ao criar enquete");
      return;
    }

    toast.success("Enquete criada com sucesso!");
    setIsCreatePollOpen(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollHashtags("");
    loadPolls();
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    await postsService.likePost(postId);
    loadPosts();
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return;
    await pollsService.vote(pollId, optionId, user.id);
    loadPolls();
  };

  const filteredPosts = posts.filter(post => {
    if (searchTerm) {
      return (
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return true;
  });

  const filteredPolls = polls.filter(poll => {
    if (searchTerm) {
      return (
        poll.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        poll.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return true;
  });

  // Mostrar loading enquanto verifica autenticação
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 animate-pulse">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver logado, mostrar tela de boas-vindas
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-slate-100">FinanceHub</CardTitle>
            <CardDescription className="text-slate-400">
              Comunidade de investidores e entusiastas do mercado financeiro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  Entrar ou Criar Conta
                </Button>
              </DialogTrigger>
              <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
                <DialogHeader>
                  <DialogTitle>
                    {authMode === "login" ? "Entrar" : "Criar Conta"}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {authMode === "login"
                      ? "Entre com suas credenciais"
                      : "Crie sua conta para começar"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === "register" && (
                    <div className="space-y-2">
                      <Label htmlFor="username">Nome de usuário</Label>
                      <Input
                        id="username"
                        name="username"
                        placeholder="seu_usuario"
                        required
                        className="border-slate-800 bg-slate-900 text-slate-100"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      className="border-slate-800 bg-slate-900 text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="border-slate-800 bg-slate-900 text-slate-100"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  >
                    {authLoading
                      ? "Processando..."
                      : authMode === "login"
                      ? "Entrar"
                      : "Criar Conta"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setAuthMode(authMode === "login" ? "register" : "login")
                    }
                    className="w-full text-slate-400 hover:text-slate-100"
                  >
                    {authMode === "login"
                      ? "Não tem conta? Criar uma"
                      : "Já tem conta? Entrar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
                <Users className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Comunidade Ativa</p>
                  <p className="text-xs text-slate-400">Compartilhe ideias e análises</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
                <BarChart2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Enquetes e Discussões</p>
                  <p className="text-xs text-slate-400">Participe de debates sobre o mercado</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
                <Newspaper className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Notícias em Tempo Real</p>
                  <p className="text-xs text-slate-400">Fique por dentro do mercado</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Interface principal (usuário logado)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">FinanceHub</h1>
                <p className="text-xs text-slate-400">Comunidade</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Post</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Compartilhe suas ideias com a comunidade
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Conteúdo</Label>
                      <Textarea
                        placeholder="O que você está pensando sobre o mercado?"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="min-h-[120px] border-slate-800 bg-slate-900 text-slate-100"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <select
                          value={postCategory}
                          onChange={(e) => setPostCategory(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Hashtags</Label>
                        <Input
                          placeholder="#bitcoin #investimentos"
                          value={postHashtags}
                          onChange={(e) => setPostHashtags(e.target.value)}
                          className="border-slate-800 bg-slate-900 text-slate-100"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>URL da Imagem (opcional)</Label>
                      <Input
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={postImage}
                        onChange={(e) => setPostImage(e.target.value)}
                        className="border-slate-800 bg-slate-900 text-slate-100"
                      />
                    </div>
                    <Button
                      onClick={handleCreatePost}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      Publicar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isCreatePollOpen} onOpenChange={setIsCreatePollOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Enquete
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar Enquete</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Pergunte à comunidade
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Pergunta</Label>
                      <Input
                        placeholder="Qual será o próximo movimento do mercado?"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="border-slate-800 bg-slate-900 text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Opções</Label>
                      {pollOptions.map((option, index) => (
                        <Input
                          key={index}
                          placeholder={`Opção ${index + 1}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...pollOptions];
                            newOptions[index] = e.target.value;
                            setPollOptions(newOptions);
                          }}
                          className="border-slate-800 bg-slate-900 text-slate-100"
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPollOptions([...pollOptions, ""])}
                        className="w-full border-slate-700 bg-slate-900 text-slate-300"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Opção
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <select
                          value={pollCategory}
                          onChange={(e) => setPollCategory(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Hashtags</Label>
                        <Input
                          placeholder="#mercado #opiniao"
                          value={pollHashtags}
                          onChange={(e) => setPollHashtags(e.target.value)}
                          className="border-slate-800 bg-slate-900 text-slate-100"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleCreatePoll}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      Criar Enquete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-100"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar posts, hashtags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-slate-800 bg-slate-900 pl-10 text-slate-100"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className={
                  selectedCategory === "all"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }
              >
                Todas
              </Button>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={
                    selectedCategory === cat.id
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-900 p-1">
            <TabsTrigger
              value="posts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger
              value="polls"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600"
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              Enquetes
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            {filteredPosts.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageCircle className="mb-4 h-12 w-12 text-slate-600" />
                  <p className="text-slate-400">Nenhum post encontrado</p>
                  <Button
                    onClick={() => setIsCreatePostOpen(true)}
                    className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600"
                  >
                    Criar Primeiro Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="border-slate-800 bg-slate-900/50 transition-all hover:border-emerald-500/50"
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.user?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                          {post.user?.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-100">
                            {post.user?.username || "Usuário"}
                          </p>
                          <Badge
                            variant="outline"
                            className={`${
                              CATEGORIES.find((c) => c.id === post.category)?.color
                            } border-0 text-white`}
                          >
                            {CATEGORIES.find((c) => c.id === post.category)?.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(post.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-slate-200 whitespace-pre-wrap">{post.content}</p>
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="w-full rounded-lg border border-slate-800"
                      />
                    )}
                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.hashtags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-slate-800 text-emerald-400"
                          >
                            <Hash className="mr-1 h-3 w-3" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikePost(post.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        {post.likes_count || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-emerald-400"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {post.comments_count || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-blue-400"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls" className="space-y-4">
            {filteredPolls.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart2 className="mb-4 h-12 w-12 text-slate-600" />
                  <p className="text-slate-400">Nenhuma enquete encontrada</p>
                  <Button
                    onClick={() => setIsCreatePollOpen(true)}
                    className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600"
                  >
                    Criar Primeira Enquete
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredPolls.map((poll) => (
                <Card
                  key={poll.id}
                  className="border-slate-800 bg-slate-900/50 transition-all hover:border-emerald-500/50"
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={poll.user?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                          {poll.user?.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-100">
                            {poll.user?.username || "Usuário"}
                          </p>
                          <Badge
                            variant="outline"
                            className={`${
                              CATEGORIES.find((c) => c.id === poll.category)?.color
                            } border-0 text-white`}
                          >
                            {CATEGORIES.find((c) => c.id === poll.category)?.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(poll.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-lg font-semibold text-slate-100">{poll.question}</p>
                    <div className="space-y-2">
                      {poll.options.map((option) => {
                        const percentage =
                          poll.total_votes > 0
                            ? Math.round((option.votes / poll.total_votes) * 100)
                            : 0;
                        return (
                          <button
                            key={option.id}
                            onClick={() => handleVote(poll.id, option.id)}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 p-3 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-800"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-200">{option.text}</span>
                              <span className="text-sm font-semibold text-emerald-400">
                                {percentage}%
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-sm text-slate-400">
                      {poll.total_votes} {poll.total_votes === 1 ? "voto" : "votos"}
                    </p>
                    {poll.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {poll.hashtags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-slate-800 text-emerald-400"
                          >
                            <Hash className="mr-1 h-3 w-3" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
