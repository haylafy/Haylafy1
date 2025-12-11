import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MessageSquare, Send, User, Shield } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SecureMessaging({ clientId, clientName }) {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['client-messages', clientId],
    queryFn: () => base44.entities.Message.list('-created_date'),
    enabled: !!clientId,
    select: (data) => data.filter(msg => 
      msg.recipient_id === clientId || msg.sender_id === clientId
    )
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      return await base44.entities.Message.create(messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
      setNewMessage('');
      toast.success('Message sent successfully');
    },
    onError: () => {
      toast.error('Failed to send message');
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    // Find admin users to send to
    const adminUsers = users.filter(u => 
      u.user_role === 'business_admin' || u.user_role === 'case_manager'
    );
    
    if (adminUsers.length === 0) {
      toast.error('No administrators available to receive messages');
      return;
    }

    sendMessageMutation.mutate({
      sender_id: clientId,
      sender_name: clientName,
      recipient_id: adminUsers[0].id,
      recipient_name: adminUsers[0].full_name,
      subject: 'Message from Family Portal',
      content: newMessage,
      status: 'unread',
      priority: 'normal'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Send New Message */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-slate-900">Send Message to Care Team</h3>
        </div>
        
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message here... Ask questions, share updates, or request information."
          rows={4}
          className="mb-4"
        />
        
        <Button 
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sendMessageMutation.isPending}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
        </Button>
      </Card>

      {/* Message History */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Message History</h3>
        
        {messages.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Messages Yet</h3>
            <p className="text-slate-500">Start a conversation with your care team using the form above.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => {
              const isFromClient = msg.sender_id === clientId;
              
              return (
                <Card key={msg.id} className={cn(
                  "p-4",
                  isFromClient ? "bg-teal-50 border-teal-100" : "bg-white"
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      isFromClient 
                        ? "bg-gradient-to-br from-teal-400 to-teal-600 text-white"
                        : "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
                    )}>
                      {isFromClient ? <User className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-900">
                            {isFromClient ? 'You' : msg.sender_name || 'Care Team'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(msg.created_date), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        
                        {!isFromClient && msg.status === 'unread' && (
                          <Badge className="bg-blue-500">New</Badge>
                        )}
                      </div>
                      
                      {msg.subject && msg.subject !== 'Message from Family Portal' && (
                        <p className="text-sm font-medium text-slate-700 mb-1">{msg.subject}</p>
                      )}
                      
                      <p className="text-slate-600 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}