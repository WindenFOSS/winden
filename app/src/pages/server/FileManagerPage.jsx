import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { useParams } from 'react-router-dom';
import { 
  File, 
  Folder,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Download,
  RefreshCcw,
  ChevronRight,
  UploadCloud,
  FilePlus,
  FileJson,
  FileText,
  Binary,
  FileCode,
  Info,
  Save,
  Loader2,
  Ellipsis,
  Archive,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Utility functions
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const getFileLanguage = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    json: 'json',
    xml: 'xml',
    html: 'html',
    css: 'css',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'shell',
    bash: 'shell',
    txt: 'plaintext',
    properties: 'properties',
    ini: 'ini',
    sql: 'sql',
    php: 'php',
    rb: 'ruby',
    rs: 'rust',
    go: 'go',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp'
  };
  return languageMap[ext] || 'plaintext';
};

const getFileIcon = (file) => {
  if (!file?.is_file) return <Folder className="h-4 w-4 text-blue-500" />;
  
  const ext = file.name.split('.').pop()?.toLowerCase();
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'rs', 'c', 'cpp', 'cs'];
  const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z'];
  
  if (codeExts.includes(ext)) return <FileCode className="h-4 w-4 text-violet-500" />;
  if (archiveExts.includes(ext)) return <Archive className="h-4 w-4 text-yellow-500" />;
  if (file.mimetype?.includes('json')) return <FileJson className="h-4 w-4 text-green-500" />;
  if (file.mimetype?.includes('text')) return <FileText className="h-4 w-4 text-orange-500" />;
  if (['jar', 'exe', 'bin', 'dll'].includes(ext)) return <Binary className="h-4 w-4 text-purple-500" />;
  
  return <File className="h-4 w-4 text-gray-500" />;
};

const FileManagerPage = () => {
  const { id } = useParams();
  
  // Core state
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [breadcrumbs, setBreadcrumbs] = useState(['/']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Selection state
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Dialog states
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newItemType, setNewItemType] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameData, setRenameData] = useState({ oldName: '', newName: '' });
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  // Editor states
  const [editorContent, setEditorContent] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('plaintext');
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Path handling
  const normalizePath = useCallback((path) => {
    path = path.replace(/\/+/g, '/');
    return path.endsWith('/') ? path : `${path}/`;
  }, []);

  const joinPaths = useCallback((...paths) => {
    return normalizePath(paths.join('/'));
  }, [normalizePath]);

  // Error handling
  const handleError = useCallback((error, customMessage = null) => {
    console.error('Operation failed:', error);
    const message = customMessage || error?.response?.data?.error || error.message || 'Operation failed';
    setError(message);
    toast({
      variant: "destructive",
      title: "Error",
      description: message,
      duration: 5000,
    });
  }, []);

  // Success handling
  const handleSuccess = useCallback((message) => {
    toast({
      title: "Success",
      description: message,
      duration: 3000,
    });
  }, []);

  // File operations
  const fetchFiles = useCallback(async (directory = '/') => {
    setIsLoading(true);
    setError(null);
    try {
      const normalizedPath = normalizePath(directory);
      const response = await fetch(`/api/server/${id}/files/list?directory=${encodeURIComponent(normalizedPath)}`);
      
      if (!response.ok) throw new Error(`Failed to fetch files: ${response.statusText}`);
      
      const data = await response.json();
      
      if (data.object === 'list') {
        setFiles(data.data.map(item => item.attributes));
        setCurrentPath(normalizedPath);
        
        const newBreadcrumbs = normalizedPath === '/' 
          ? ['/']
          : ['/', ...normalizedPath.split('/').filter(Boolean)];
        setBreadcrumbs(newBreadcrumbs);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      handleError(err, 'Failed to fetch files');
    } finally {
      setIsLoading(false);
    }
  }, [id, normalizePath, handleError]);

  const handleFileView = useCallback(async (file) => {
    try {
      setIsLoading(true);
      const filePath = joinPaths(currentPath, file.name);
      const response = await fetch(`/api/server/${id}/files/contents?file=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) throw new Error(`Failed to fetch file contents: ${response.statusText}`);
      
      const content = await response.text();
      setEditorLanguage(getFileLanguage(file.name));
      setEditorContent(content);
      setSelectedFile(file);
      setIsEditorDirty(false);
    } catch (err) {
      handleError(err, 'Failed to view file contents');
    } finally {
      setIsLoading(false);
    }
  }, [id, currentPath, joinPaths, handleError]);

  const handleFileSave = async () => {
    if (!selectedFile) return;
    
    try {
      setIsSaving(true);
      const filePath = joinPaths(currentPath, selectedFile.name);
      const response = await fetch(`/api/server/${id}/files/write?file=${encodeURIComponent(filePath)}`, {
        method: 'POST',
        body: editorContent // Send raw content directly
      });
  
      if (!response.ok) throw new Error(`Failed to save file: ${response.statusText}`);
      
      handleSuccess('File saved successfully');
      setIsEditorDirty(false);
    } catch (err) {
      handleError(err, 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleNewItem = async () => {
    if (!newItemName.trim()) {
      handleError(new Error('Name cannot be empty'));
      return;
    }
  
    try {
      const normalizedPath = normalizePath(currentPath);
      
      if (newItemType === 'folder') {
        const response = await fetch(`/api/server/${id}/files/create-folder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            root: normalizedPath,
            name: newItemName
          })
        });
  
        if (!response.ok) throw new Error(`Failed to create folder: ${response.statusText}`);
      } else {
        // Create new file by writing a space to it
        const filePath = joinPaths(currentPath, newItemName);
        const response = await fetch(`/api/server/${id}/files/write?file=${encodeURIComponent(filePath)}`, {
          method: 'POST',
          body: ' ' // Send a single space as content
        });
  
        if (!response.ok) throw new Error(`Failed to create file: ${response.statusText}`);
      }
      
      handleSuccess(`${newItemType === 'folder' ? 'Folder' : 'File'} created successfully`);
      fetchFiles(normalizedPath);
      setShowNewDialog(false);
      setNewItemName('');
      setNewItemType(null);
    } catch (err) {
      handleError(err, `Failed to create ${newItemType}`);
    }
  };

  const handleFileRename = async () => {
    if (!renameData.newName.trim()) {
      handleError(new Error('New name cannot be empty'));
      return;
    }

    try {
      const normalizedPath = normalizePath(currentPath);
      const response = await fetch(`/api/server/${id}/files/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          root: normalizedPath,
          files: [
            { from: renameData.oldName, to: renameData.newName }
          ]
        })
      });

      if (!response.ok) throw new Error(`Failed to rename file: ${response.statusText}`);
      
      handleSuccess('File renamed successfully');
      fetchFiles(normalizedPath);
      setShowRenameDialog(false);
      setRenameData({ oldName: '', newName: '' });
    } catch (err) {
      handleError(err, 'Failed to rename file');
    }
  };

  const handleFileDelete = async (files) => {
    const fileList = Array.isArray(files) ? files : [files];
    
    try {
      const normalizedPath = normalizePath(currentPath);
      const response = await fetch(`/api/server/${id}/files/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          root: normalizedPath,
          files: fileList
        })
      });

      if (!response.ok) throw new Error(`Failed to delete files: ${response.statusText}`);
      
      handleSuccess(fileList.length > 1 ? `${fileList.length} files deleted` : 'File deleted successfully');
      fetchFiles(normalizedPath);
      setSelectedFiles([]);
    } catch (err) {
      handleError(err, 'Failed to delete file(s)');
    }
  };

  const handleArchive = async (files) => {
    const fileList = Array.isArray(files) ? files : [files];
    
    try {
      const normalizedPath = normalizePath(currentPath);
      const response = await fetch(`/api/server/${id}/files/compress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          root: normalizedPath,
          files: fileList
        })
      });

      if (!response.ok) throw new Error(`Failed to create archive: ${response.statusText}`);
      
      handleSuccess('Files archived successfully');
      fetchFiles(normalizedPath);
      setShowArchiveDialog(false);
      setSelectedFiles([]);
    } catch (err) {
      handleError(err, 'Failed to archive files');
    }
  };

  const handleUnarchive = async (file) => {
    try {
      const normalizedPath = normalizePath(currentPath);
      const response = await fetch(`/api/server/${id}/files/decompress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          root: normalizedPath,
          file: file.name // Pass just the filename
        })
      });

      if (!response.ok) throw new Error(`Failed to unarchive file: ${response.statusText}`);
      
      handleSuccess('File unarchived successfully');
      fetchFiles(normalizedPath);
    } catch (err) {
      handleError(err, 'Failed to unarchive file');
    }
  };

const downloadFile = async (file) => {
  try {
    const normalizedPath = normalizePath(currentPath);
    const filePath = joinPaths(normalizedPath, file.name);
    
    const response = await fetch(`/api/server/${id}/files/download?file=${encodeURIComponent(filePath)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Failed to get download URL: ${response.statusText}`);
    
    const data = await response.json();
    
    if (data.object === 'signed_url') {
      const link = document.createElement('a');
      link.href = data.attributes.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      handleSuccess('Download started');
    } else {
      throw new Error('Invalid download URL response');
    }
  } catch (err) {
    handleError(err, 'Failed to download file');
  }
};

const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  try {
    setUploadProgress(0);
    const normalizedPath = normalizePath(currentPath);
    
    // Get signed upload URL
    const uploadUrlResponse = await fetch(`/api/server/${id}/files/upload`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!uploadUrlResponse.ok) throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText}`);
    
    const uploadUrlData = await uploadUrlResponse.json();
    
    if (uploadUrlData.object !== 'signed_url') {
      throw new Error('Invalid upload URL response');
    }

    // Create FormData
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    // Upload with progress tracking
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrlData.attributes.url);
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        handleSuccess(`${files.length} file(s) uploaded successfully`);
        fetchFiles(normalizedPath);
        setShowUploadDialog(false);
        setUploadProgress(0);
      } else {
        throw new Error(`Upload failed with status: ${xhr.status}`);
      }
    };
    
    xhr.onerror = () => {
      throw new Error('Upload failed');
    };
    
    xhr.send(formData);
  } catch (err) {
    handleError(err, 'Failed to upload file(s)');
    setUploadProgress(0);
  }
};

// Navigation
const handleNavigateToPath = useCallback((path) => {
  if (isEditorDirty) {
    if (window.confirm('You have unsaved changes. Are you sure you want to navigate away?')) {
      setSelectedFile(null);
      setEditorContent('');
      setIsEditorDirty(false);
      fetchFiles(path);
    }
  } else {
    fetchFiles(path);
  }
}, [isEditorDirty, fetchFiles]);

const handleNavigateUp = useCallback(() => {
  if (currentPath === '/') return;
  const parentPath = currentPath.split('/').slice(0, -2).join('/') || '/';
  handleNavigateToPath(parentPath);
}, [currentPath, handleNavigateToPath]);

// Initial load
useEffect(() => {
  fetchFiles();
}, [fetchFiles]);

// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && selectedFile) {
      e.preventDefault();
      handleFileSave();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [selectedFile, handleFileSave]);

// Render helpers
const renderFileActions = useCallback((file) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <Ellipsis className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      {file.is_file && (
        <>
          <DropdownMenuItem onClick={() => handleFileView(file)}>
            <FileText className="mr-2 h-4 w-4" /> View/Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadFile(file)}>
            <Download className="mr-2 h-4 w-4" /> Download
          </DropdownMenuItem>
          {file.name.match(/\.(zip|tar|gz|rar|7z)$/i) ? (
            <DropdownMenuItem onClick={() => handleUnarchive(file)}>
              <Archive className="mr-2 h-4 w-4" /> Extract
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleArchive(file.name)}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem
        onClick={() => {
          setRenameData({
            oldName: file.name,
            newName: file.name
          });
          setShowRenameDialog(true);
        }}
      >
        <Edit2 className="mr-2 h-4 w-4" /> Rename
      </DropdownMenuItem>
      <DropdownMenuItem
        className="text-destructive focus:text-destructive"
        onClick={() => handleFileDelete(file.name)}
      >
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
), [handleFileView, downloadFile, handleUnarchive, handleArchive, handleFileDelete]);

return (
  <div className="min-h-screen bg-background p-6">
    <Card className="max-w-[1600px] mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            {currentPath !== '/' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNavigateUp}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Go up</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="flex items-center space-x-1">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <Button
                    variant="ghost"
                    className="h-8 text-sm px-2 hover:bg-accent"
                    onClick={() => {
                      const path = breadcrumbs.slice(0, index + 1).join('');
                      handleNavigateToPath(path);
                    }}
                  >
                    {crumb === '/' ? 'Root' : crumb}
                  </Button>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => {
                    setNewItemType('file');
                    setShowNewDialog(true);
                  }}
                >
                  <FilePlus className="mr-2 h-4 w-4" /> New File
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setNewItemType('folder');
                    setShowNewDialog(true);
                  }}
                >
                  <Folder className="mr-2 h-4 w-4" /> New Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(true)}
            >
              <UploadCloud className="mr-2 h-4 w-4" /> Upload
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchFiles(currentPath)}
                    disabled={isLoading}
                  >
                    <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* File Table */}
        <ScrollArea className="h-[600px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={files.length > 0 && selectedFiles.length === files.length}
                    onCheckedChange={(checked) => {
                      setSelectedFiles(checked ? files.map(f => f.name) : []);
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow 
                  key={file.name}
                  className={selectedFiles.includes(file.name) ? 'bg-accent' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedFiles.includes(file.name)}
                      onCheckedChange={(checked) => {
                        setSelectedFiles(
                          checked 
                            ? [...selectedFiles, file.name]
                            : selectedFiles.filter(f => f !== file.name)
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div 
                      className="flex items-center space-x-2 cursor-pointer hover:text-primary"
                      onClick={() => {
                        if (file.is_file) {
                          handleFileView(file);
                        } else {
                          handleNavigateToPath(joinPaths(currentPath, file.name));
                        }
                      }}
                    >
                      {getFileIcon(file)}
                      <span className="font-medium">{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatBytes(file.size)}</TableCell>
                  <TableCell>{formatDate(file.modified_at)}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {file.mode}
                    </code>
                  </TableCell>
                  <TableCell>
                    {renderFileActions(file)}
                  </TableCell>
                </TableRow>
              ))}
              {files.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    This folder is empty
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>

    {/* New Item Dialog */}
    <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New {newItemType === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          <DialogDescription>
            Enter a name for the new {newItemType}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={newItemType === 'folder' ? 'New Folder' : 'file.txt'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNewItem();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setShowNewDialog(false);
            setNewItemName('');
            setNewItemType(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleNewItem}
            disabled={!newItemName.trim()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Upload Dialog */}
    <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Drag and drop files or click to select
          </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors relative"
              onClick={() => document.getElementById('file-upload').click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-primary');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-primary');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-primary');
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                  const input = document.getElementById('file-upload');
                  input.files = e.dataTransfer.files;
                  handleFileUpload({ target: input });
                }
              }}
            >
              <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drop files here or click to browse
              </p>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                multiple
                onChange={handleFileUpload}
              />
            </div>
            {uploadProgress > 0 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadProgress}% uploaded
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* File Editor Dialog */}
      <Dialog 
        open={selectedFile !== null} 
        onOpenChange={(open) => {
          if (!open && isEditorDirty) {
            const willClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
            if (willClose) {
              setSelectedFile(null);
              setEditorContent('');
              setIsEditorDirty(false);
            }
          } else if (!open) {
            setSelectedFile(null);
            setEditorContent('');
            setIsEditorDirty(false);
          }
        }}
      >
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getFileIcon(selectedFile || {})}
                <span>{selectedFile?.name}</span>
                {isEditorDirty && <span className="text-sm text-muted-foreground">(unsaved)</span>}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={isEditorDirty ? "default" : "outline"}
                  size="sm"
                  onClick={handleFileSave}
                  disabled={!isEditorDirty || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isEditorDirty) {
                      const willClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
                      if (willClose) {
                        setSelectedFile(null);
                        setEditorContent('');
                        setIsEditorDirty(false);
                      }
                    } else {
                      setSelectedFile(null);
                      setEditorContent('');
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="h-[calc(80vh-8rem)]">
            <Editor
              height="100%"
              language={editorLanguage}
              value={editorContent}
              onChange={(value) => {
                setEditorContent(value || '');
                setIsEditorDirty(true);
              }}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
                renderWhitespace: 'selection',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                bracketPairColorization: true
              }}
              loading={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Item</DialogTitle>
            <DialogDescription>
              Enter a new name for the item
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newName">New name</Label>
              <Input
                id="newName"
                value={renameData.newName}
                onChange={(e) => setRenameData({ ...renameData, newName: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFileRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRenameDialog(false);
              setRenameData({ oldName: '', newName: '' });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleFileRename}
              disabled={!renameData.newName.trim() || renameData.newName === renameData.oldName}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Archive</DialogTitle>
            <DialogDescription>
              {selectedFiles.length} file(s) will be archived
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowArchiveDialog(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleArchive}
            >
              Create Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Bulk Actions positioning */}
      {selectedFiles.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="shadow-lg">
            <CardContent className="flex items-center gap-4 p-4">
              <span className="text-sm text-muted-foreground">
                {selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(selectedFiles)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete ${selectedFiles.length} file(s)?`)) {
                      handleFileDelete(selectedFiles);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-2 bg-background p-4 rounded-lg shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagerPage;