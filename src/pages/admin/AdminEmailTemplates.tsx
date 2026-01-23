import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, Plus, Search, MoreHorizontal, Edit, Trash2, Send, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

import { useEmailTemplates, useDeleteEmailTemplate, type EmailTemplate } from "@/hooks/admin/useEmailTemplates";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { BulkEmailModal } from "@/components/admin/BulkEmailModal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

export default function AdminEmailTemplates() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  const category = categoryFilter === 'all' ? undefined : categoryFilter;
  const { data: templates, isLoading, refetch } = useEmailTemplates(category);
  const deleteTemplate = useDeleteEmailTemplate();

  const filteredTemplates = templates?.filter(t => 
    !search || 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleNewTemplate = () => {
    setSelectedTemplate({});
    setEditorOpen(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditorOpen(true);
  };

  const handleDeleteClick = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    }
  };

  const getCategoryBadge = (category: string | null) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      transactional: { label: 'Tranzakciós', variant: 'default' },
      marketing: { label: 'Marketing', variant: 'secondary' },
      notification: { label: 'Értesítés', variant: 'outline' }
    };
    const config = variants[category || 'transactional'] || variants.transactional;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Sablonok</h1>
          <p className="text-muted-foreground">Tranzakcionális és marketing emailek kezelése</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkEmailOpen(true)}>
            <Send className="mr-2 h-4 w-4" />
            Tömeges küldés
          </Button>
          <Button onClick={handleNewTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            Új sablon
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Keresés név, slug, tárgy alapján..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Kategória" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Minden kategória</SelectItem>
                <SelectItem value="transactional">Tranzakciós</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="notification">Értesítés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nincs email sablon</p>
              <Button variant="link" onClick={handleNewTemplate}>
                Hozz létre egyet
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Név</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Tárgy</TableHead>
                  <TableHead>Kategória</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Módosítva</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{template.slug}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{template.subject}</TableCell>
                    <TableCell>{getCategoryBadge(template.category)}</TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Aktív" : "Inaktív"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(template.updated_at), 'yyyy.MM.dd', { locale: hu })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Szerkesztés
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(template)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Törlés
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Template Editor Modal */}
      <EmailTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={selectedTemplate}
        onSave={() => {
          setEditorOpen(false);
          refetch();
        }}
      />

      {/* Bulk Email Modal */}
      <BulkEmailModal
        open={bulkEmailOpen}
        onOpenChange={setBulkEmailOpen}
        templates={templates}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleConfirmDelete}
        type="delete"
        title="Sablon törlése"
        description={`Biztosan törölni szeretnéd a "${templateToDelete?.name}" sablont? Ez a művelet nem vonható vissza.`}
        isLoading={deleteTemplate.isPending}
      />
    </div>
  );
}
