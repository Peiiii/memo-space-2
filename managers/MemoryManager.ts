import { v4 as uuidv4 } from 'uuid';
import { Memory } from '../types';
import { useMemoryStore } from '../stores/memoryStore';
import { interpretMemory, expandMemory } from '../services/geminiService';
import { useViewStore } from '../stores/viewStore';
import { useGalleryStore } from '../stores/galleryStore';
import { useWorldStore } from '../stores/worldStore';

// Initial Data
const RAW_MEMORY_DATA = [
  {
    id: 'mem-sunset',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
    description: "夕阳沉入地平线，带走了最后的喧嚣。",
    scale: 1.1,
    rotation: -5,
  },
  {
    id: 'mem-forest',
    url: 'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=600&auto=format&fit=crop',
    description: "深林的呼吸，是地球最古老的语言。",
    scale: 1,
    rotation: 5,
  },
  {
    id: 'mem-urban',
    url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=600&auto=format&fit=crop',
    description: "城市灯火阑珊，藏着万千心事。",
    scale: 1.15,
    rotation: -8,
  },
  {
    id: 'mem-coffee',
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop',
    description: "时光在咖啡香气中变得缓慢而醇厚。",
    scale: 0.9,
    rotation: 12,
  },
  {
    id: 'mem-sea',
    url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=600&auto=format&fit=crop',
    description: "海浪轻抚沙滩，抹去昨日的足迹。",
    scale: 1.2,
    rotation: 0,
  },
  {
    id: 'mem-stars',
    url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=600&auto=format&fit=crop',
    description: "在星尘的注视下，我们都是孩子。",
    scale: 1.05,
    rotation: -15,
  },
  {
    id: 'mem-book',
    url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop',
    description: "文字搭建的城堡，比现实更永恒。",
    scale: 0.95,
    rotation: 8,
  },
  {
    id: 'mem-cat',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600&auto=format&fit=crop',
    description: "柔软的注视，治愈了坚硬的世界。",
    scale: 1.0,
    rotation: -4,
  },
  {
    id: 'mem-rain',
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=600&auto=format&fit=crop',
    description: "雨滴敲打窗棂，像一首未完的诗。",
    scale: 1.08,
    rotation: 6,
  },
  {
    id: 'mem-flower',
    url: 'https://images.unsplash.com/photo-1460039230329-eb070fc6c77c?q=80&w=600&auto=format&fit=crop',
    description: "花开一瞬，却留下了整个春天的记忆。",
    scale: 0.92,
    rotation: -10,
  },
  {
    id: 'mem-snow',
    url: 'https://images.unsplash.com/photo-1548266652-99cf27701ced?q=80&w=600&auto=format&fit=crop',
    description: "世界纯白如初，掩盖了所有的来路。",
    scale: 1.02,
    rotation: 3,
  },
  {
    id: 'mem-night',
    url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=600&auto=format&fit=crop',
    description: "夜色温柔，收容了所有流浪的梦。",
    scale: 0.98,
    rotation: -6,
  },
];

// Helper: Fibonacci Sphere Distribution
const getFibonacciPos = (index: number, total: number) => {
  const phi = Math.acos(1 - 2 * (index + 0.5) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  return { theta, phi };
};

// Calculate spherical coordinates that correspond to the "Front" view
const getFrontAndCenterPos = (rotXDeg: number, rotYDeg: number) => {
  const rotX = rotXDeg * Math.PI / 180;
  const rotY = rotYDeg * Math.PI / 180;

  const x = -Math.cos(rotX) * Math.sin(rotY);
  const y = Math.sin(rotX);
  const z = Math.cos(rotX) * Math.cos(rotY);

  const clampedY = Math.max(-1, Math.min(1, y));
  const phi = Math.acos(clampedY);
  const theta = Math.atan2(z, x);

  return { theta, phi };
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      }
    };
    reader.onerror = error => reject(error);
  });
};

export class MemoryManager {
  loadInitialMemories = () => {
    const memories: Memory[] = RAW_MEMORY_DATA.map((data, index) => {
      const pos = getFibonacciPos(index, RAW_MEMORY_DATA.length);
      const simulatedTime = Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000;
      return {
        ...data,
        timestamp: simulatedTime,
        theta: pos.theta,
        phi: pos.phi,
        driftSpeed: 0.8 + Math.random() * 0.4,
        isAnalyzing: false,
      };
    });
    useMemoryStore.getState().setMemories(memories);
  };

  uploadFiles = async (files: FileList | null, currentRotation: { x: number, y: number }) => {
    if (!files || files.length === 0) return;

    const centerPos = getFrontAndCenterPos(currentRotation.x, currentRotation.y);
    const newMemories: Memory[] = [];

    // Pre-create memory objects
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const id = uuidv4();
      const objectUrl = URL.createObjectURL(file);
      
      const spread = 0.3;
      const theta = centerPos.theta + (Math.random() - 0.5) * spread;
      let phi = centerPos.phi + (Math.random() - 0.5) * spread;
      phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

      newMemories.push({
        id,
        url: objectUrl,
        description: "正在唤醒记忆...",
        timestamp: Date.now(),
        theta: theta,
        phi: phi,
        scale: 0.9 + Math.random() * 0.3,
        rotation: Math.random() * 30 - 15,
        driftSpeed: 10 + Math.random() * 10,
        isAnalyzing: true,
      });
    }

    // Update store with new placeholders
    useMemoryStore.getState().addMemories(newMemories);

    // Update active indices for other views
    const totalMemories = useMemoryStore.getState().memories.length;
    // Update Gallery
    useGalleryStore.getState().setActiveIndex(totalMemories - 1);
    // Update World
    useWorldStore.getState().setActiveIndex(totalMemories - 1);

    // Process analysis
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const memory = newMemories[i]; // Corresponding memory

        try {
            const base64 = await fileToBase64(file);
            const description = await interpretMemory(base64, file.type);
            useMemoryStore.getState().updateMemory(memory.id, { description, isAnalyzing: false });
        } catch (e) {
            console.error(e);
            useMemoryStore.getState().updateMemory(memory.id, { description: "记忆模糊...", isAnalyzing: false });
        }
    }
  };

  selectMemory = (id: string | null) => {
    useMemoryStore.getState().setSelectedMemoryId(id);
  };

  expandMemoryDescription = async (id: string, currentDesc: string, prompt: string, fileUrl: string) => {
    if (!prompt.trim()) return;
    
    useMemoryStore.getState().setIsProcessing(true);
    
    try {
        const blob = await fetch(fileUrl).then(r => r.blob());
        const base64 = await fileToBase64(new File([blob], "image"));
        
        const addedText = await expandMemory(
            base64,
            blob.type,
            currentDesc,
            prompt
        );

        if (addedText) {
            const separator = /[\u4e00-\u9fa5]/.test(currentDesc.slice(-1)) ? '' : ' ';
            const newDescription = `${currentDesc}${separator}${addedText}`;
            useMemoryStore.getState().updateMemory(id, { description: newDescription });
        }
    } catch (err) {
        console.error("Error expanding memory:", err);
    } finally {
        useMemoryStore.getState().setIsProcessing(false);
    }
  }
}
