import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Move, ChevronDown, ChevronRight } from 'lucide-react';

interface OptionGroup {
  id: string;
  name: string;
  description?: string;
  level: number;
  parentGroupId?: string;
  isParent: boolean;
  isActive: boolean;
  affectsStock: boolean;
  path?: string;
  sortOrder: number;
  options: Option[];
  childGroups?: OptionGroup[];
}

interface Option {
  id: string;
  name: string;
  description?: string;
  priceValue?: number;
  sortOrder: number;
  isAvailable: boolean;
}

interface FlexibleOptionGroupManagerProps {
  productId: string;
  optionGroups: OptionGroup[];
  onUpdate: () => void;
}

export default function FlexibleOptionGroupManager({ 
  productId, 
  optionGroups, 
  onUpdate 
}: FlexibleOptionGroupManagerProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddOption, setShowAddOption] = useState<string | null>(null);

  // Build hierarchical tree structure
  const buildHierarchy = (groups: OptionGroup[]): OptionGroup[] => {
    const groupMap = new Map(groups.map(g => [g.id, { ...g, childGroups: [] }]));
    const rootGroups: OptionGroup[] = [];

    groups.forEach(group => {
      const groupWithChildren = groupMap.get(group.id)!;
      
      if (!group.parentGroupId) {
        rootGroups.push(groupWithChildren);
      } else {
        const parent = groupMap.get(group.parentGroupId);
        if (parent) {
          parent.childGroups!.push(groupWithChildren);
        }
      }
    });

    return rootGroups.sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const hierarchicalGroups = buildHierarchy(optionGroups);

  const toggleExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const renderOptionGroup = (group: OptionGroup, depth: number = 0) => {
    const isExpanded = expandedGroups.has(group.id);
    const hasChildren = group.childGroups && group.childGroups.length > 0;
    const indentClass = `ml-${depth * 4}`;

    return (
      <div key={group.id} className="border rounded-lg mb-2">
        {/* Group Header */}
        <div className={`p-3 bg-gray-50 ${indentClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasChildren && (
                <button
                  onClick={() => toggleExpanded(group.id)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  depth === 0 ? 'bg-blue-100 text-blue-800' :
                  depth === 1 ? 'bg-green-100 text-green-800' :
                  depth === 2 ? 'bg-purple-100 text-purple-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  Level {group.level}
                </span>
                
                <h3 className="font-medium text-gray-900">{group.name}</h3>
                
                {group.description && (
                  <span className="text-sm text-gray-500">- {group.description}</span>
                )}
                
                <span className="text-xs text-gray-400">
                  ({group.options.length} options)
                </span>
                
                {!group.isActive && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowAddOption(group.id)}
                className="p-1 text-green-600 hover:bg-green-100 rounded"
                title="Add Option"
              >
                <Plus className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setEditingGroup(group.id)}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                title="Edit Group"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              
              <button
                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                title="Move Group"
              >
                <Move className="w-4 h-4" />
              </button>
              
              <button
                className="p-1 text-red-600 hover:bg-red-100 rounded"
                title="Delete Group"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Group Path Display */}
          {group.path && (
            <div className="mt-2 text-xs text-gray-500">
              Path: {group.path}
            </div>
          )}
        </div>

        {/* Options List */}
        {isExpanded && (
          <div className="p-3 border-t bg-white">
            <div className="space-y-2">
              {group.options.map(option => (
                <div key={option.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{option.name}</span>
                    {option.description && (
                      <span className="text-sm text-gray-500">- {option.description}</span>
                    )}
                    {option.priceValue && option.priceValue !== 0 && (
                      <span className="text-sm text-green-600">
                        +${option.priceValue}
                      </span>
                    )}
                    {!option.isAvailable && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        Unavailable
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setEditingOption(option.id)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      title="Edit Option"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    
                    <button
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Delete Option"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              
              {showAddOption === group.id && (
                <div className="p-3 bg-blue-50 rounded border-2 border-blue-200">
                  <h4 className="font-medium mb-2">Add New Option</h4>
                  {/* Add option form would go here */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowAddOption(null)}
                      className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                    >
                      Cancel
                    </button>
                    <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                      Save Option
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Child Groups */}
        {isExpanded && hasChildren && (
          <div className="border-t">
            {group.childGroups!.map(childGroup => 
              renderOptionGroup(childGroup, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Flexible Option Groups
          </h2>
          <p className="text-sm text-gray-600">
            Create unlimited nested option groups for complex product variants
          </p>
        </div>
        
        <button
          onClick={() => setShowAddGroup(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          <span>Add Group</span>
        </button>
      </div>

      {/* Hierarchical Groups Display */}
      <div className="space-y-2">
        {hierarchicalGroups.map(group => renderOptionGroup(group))}
      </div>

      {/* Add Group Form */}
      {showAddGroup && (
        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h3 className="font-medium mb-3">Add New Option Group</h3>
          {/* Add group form would go here */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAddGroup(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded">
              Create Group
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Groups:</span>
            <span className="ml-2 font-medium">{optionGroups.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Active Groups:</span>
            <span className="ml-2 font-medium">
              {optionGroups.filter(g => g.isActive).length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Max Depth:</span>
            <span className="ml-2 font-medium">
              {Math.max(...optionGroups.map(g => g.level), 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Total Options:</span>
            <span className="ml-2 font-medium">
              {optionGroups.reduce((sum, g) => sum + g.options.length, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
