import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  Send, 
  Search,
  User,
  Check,
  CheckCheck,
  Plus,
  Paperclip,
  Megaphone,
  AlertTriangle,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import BroadcastDialog from '@/components/messaging/BroadcastDialog';
import MessageAttachments from '@/components/messaging/MessageAttachments';
import { hasPermission } from '@/components/utils/permissions';
import { toast } from "sonner";

export default function Messages() {
  const [search, setSearch] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [priority, setPriority] = useState('normal');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date'),
    refetchInterval: 5000, // Poll every 5 seconds for real-time feel
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Group messages by conversation (exclude broadcasts)
  const conversations = React.useMemo(() => {
    const convMap = new Map();
    const directMessages = messages.filter(m => !m.is_broadcast);
    
    directMessages.forEach(msg => {
      const partnerId = msg.sender_id === currentUser?.id ? msg.recipient_id : msg.sender_id;
      const partnerName = msg.sender_id === currentUser?.id ? msg.recipient_name : msg.sender_name;
      
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          partnerId,
          partnerName: partnerName || 'Unknown',
          messages: [],
          lastMessage: null,
          unreadCount: 0,
        });
      }
      
      const conv = convMap.get(partnerId);
      conv.messages.push(msg);
      
      if (!conv.lastMessage || new Date(msg.created_date) > new Date(conv.lastMessage.created_date)) {
        conv.lastMessage = msg;
      }
      
      if (!msg.is_read && msg.recipient_id === currentUser?.id) {
        conv.unreadCount++;
      }
    });
    
    return Array.from(convMap.values()).sort((a, b) => 
      new Date(b.lastMessage?.created_date) - new Date(a.lastMessage?.created_date)
    );
  }, [messages, currentUser]);

  const filteredConversations = conversations.filter(conv =>
    conv.partnerName?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMessages = selectedConversation?.messages.sort((a, b) =>
    new Date(a.created_date) - new Date(b.created_date)
  ) || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedMessages]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({
          name: file.name,
          url: file_url,
          type: file.type,
          size: file.size
        });
      }
      setAttachments([...attachments, ...uploaded]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !selectedConversation) return;
    
    const messageData = {
      business_id: currentUser?.business_id,
      sender_id: currentUser?.id,
      sender_name: currentUser?.full_name,
      recipient_id: selectedConversation.partnerId,
      recipient_name: selectedConversation.partnerName,
      content: newMessage || '(attachment)',
      is_read: false,
      priority,
      is_urgent: priority === 'critical',
      attachments: attachments.length > 0 ? attachments : undefined
    };

    await base44.entities.Message.create(messageData);

    // Create notification for urgent messages
    if (priority !== 'normal') {
      const recipient = users.find(u => u.id === selectedConversation.partnerId);
      if (recipient?.email) {
        await base44.entities.Notification.create({
          user_email: recipient.email,
          type: priority === 'critical' ? 'urgent' : 'general',
          title: priority === 'critical' ? '🚨 Critical Message' : '⚠️ Urgent Message',
          message: `New ${priority} message from ${currentUser?.full_name}`,
          priority: priority === 'critical' ? 'urgent' : 'high'
        });
      }
    }
    
    setNewMessage('');
    setAttachments([]);
    setPriority('normal');
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleNewConversation = async () => {
    if (!recipientId) return;
    
    const recipient = [...caregivers, ...users].find(u => u.id === recipientId);
    
    setSelectedConversation({
      partnerId: recipientId,
      partnerName: recipient?.name || recipient?.full_name || 'Unknown',
      messages: [],
    });
    
    setNewConversationOpen(false);
    setRecipientId('');
  };

  const markAsRead = async (conv) => {
    const unreadMessages = conv.messages.filter(
      m => !m.is_read && m.recipient_id === currentUser?.id
    );
    
    for (const msg of unreadMessages) {
      await base44.entities.Message.update(msg.id, { ...msg, is_read: true });
    }
    
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    if (conv.unreadCount > 0) {
      markAsRead(conv);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-500 mt-1">Communicate with your team</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setNewConversationOpen(true)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
          {hasPermission(currentUser, 'CREATE_CLIENTS') && (
            <Button 
              onClick={() => setBroadcastDialogOpen(true)}
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Broadcast
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[calc(100%-5rem)] flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-full md:w-80 border-r border-slate-100 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {loadingMessages ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">No conversations yet</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.partnerId}
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-colors",
                      selectedConversation?.partnerId === conv.partnerId
                        ? "bg-teal-50 border border-teal-200"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-medium">
                        {conv.partnerName?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-slate-900 truncate">
                            {conv.partnerName}
                          </h4>
                          {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {conv.lastMessage?.content}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="hidden md:flex flex-1 flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-medium">
                  {selectedConversation.partnerName?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {selectedConversation.partnerName}
                  </h3>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedMessages.map((msg) => {
                    const isOwn = msg.sender_id === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2",
                            isOwn
                              ? "bg-teal-600 text-white rounded-br-sm"
                              : "bg-slate-100 text-slate-900 rounded-bl-sm"
                          )}
                        >
                          {msg.priority && msg.priority !== 'normal' && (
                           <div className={cn(
                             "flex items-center gap-1 mb-1 text-xs font-medium",
                             msg.priority === 'critical' ? "text-red-300" : "text-amber-300"
                           )}>
                             <AlertTriangle className="w-3 h-3" />
                             {msg.priority === 'critical' ? 'CRITICAL' : 'URGENT'}
                           </div>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          <MessageAttachments attachments={msg.attachments} isOwn={isOwn} />
                          <div className={cn(
                           "flex items-center gap-1 mt-1 text-xs",
                           isOwn ? "text-teal-200" : "text-slate-500"
                          )}>
                           <span>{format(new Date(msg.created_date), 'h:mm a')}</span>
                           {isOwn && (
                             msg.is_read ? (
                               <CheckCheck className="w-3.5 h-3.5" />
                             ) : (
                               <Check className="w-3.5 h-3.5" />
                             )
                           )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-slate-100 space-y-2">
                {/* Priority & Attachments */}
                <div className="flex items-center gap-2">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">⚠️ Urgent</SelectItem>
                      <SelectItem value="critical">🚨 Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </div>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs">
                        <span className="truncate max-w-[100px]">{file.name}</span>
                        <button onClick={() => removeAttachment(index)}>
                          <X className="w-3 h-3 text-slate-500 hover:text-slate-700" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="resize-none"
                    rows={1}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && attachments.length === 0}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Send to</label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a recipient" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Caregivers</div>
                  {caregivers.map((caregiver) => (
                    <SelectItem key={caregiver.id} value={caregiver.id}>
                      {caregiver.name}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 border-t mt-2">Staff</div>
                  {users.filter(u => u.user_role && u.user_role !== 'caregiver').map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.user_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setNewConversationOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleNewConversation}
                disabled={!recipientId}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Start Conversation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <BroadcastDialog 
        open={broadcastDialogOpen} 
        onOpenChange={setBroadcastDialogOpen}
        currentUser={currentUser}
      />
    </div>
  );
}