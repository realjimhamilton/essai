const express = require('express');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const {
  getProjects,
  getProject,
  saveProject,
  deleteProject,
  updateProjectName,
} = require('~/models/Project');

const router = express.Router();
router.use(requireJwtAuth);

/**
 * GET /projects
 * Get all projects for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const projects = await getProjects(req.user.id);
    res.status(200).json(projects);
  } catch (error) {
    logger.error('[/projects] Error getting projects', error);
    res.status(500).send('Error retrieving projects');
  }
});

/**
 * GET /projects/:projectId
 * Get a specific project by ID
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await getProject(req.user.id, projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(200).json(project);
  } catch (error) {
    logger.error('[/projects/:projectId] Error getting project', error);
    res.status(500).send('Error retrieving project');
  }
});

/**
 * POST /projects
 * Create a new project
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, systemPrompt, ragFileIds } = req.body || {};
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = await saveProject(req.user.id, {
      name: name.trim(),
      description: description || null,
      systemPrompt: systemPrompt || null,
      ragFileIds: Array.isArray(ragFileIds) ? ragFileIds : [],
    });

    res.status(201).json(project);
  } catch (error) {
    logger.error('[/projects] Error creating project', error);
    if (error.code === 11000) {
      // Duplicate key error (unique index violation)
      return res.status(409).json({ message: 'A project with this name already exists' });
    }
    res.status(500).send('Error creating project');
  }
});

/**
 * PATCH /projects/:projectId
 * Update a project (name, systemPrompt, defaultPresetId, ragFileIds)
 */
router.patch('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, systemPrompt, ragFileIds } = req.body || {};

    const update = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'Project name must be a non-empty string' });
      }
      update.name = name.trim();
    }
    if (description !== undefined) {
      update.description = description || null;
    }
    if (systemPrompt !== undefined) {
      update.systemPrompt = systemPrompt || null;
    }
    if (ragFileIds !== undefined) {
      update.ragFileIds = Array.isArray(ragFileIds) ? ragFileIds : [];
    }

    const project = await saveProject(req.user.id, { _id: projectId, ...update });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json(project);
  } catch (error) {
    logger.error('[/projects/:projectId] Error updating project', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A project with this name already exists' });
    }
    res.status(500).send('Error updating project');
  }
});

/**
 * PATCH /projects/:projectId/rename
 * Rename a project (convenience endpoint)
 */
router.patch('/:projectId/rename', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = await updateProjectName(req.user.id, projectId, name.trim());
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json(project);
  } catch (error) {
    logger.error('[/projects/:projectId/rename] Error renaming project', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A project with this name already exists' });
    }
    res.status(500).send('Error renaming project');
  }
});

/**
 * DELETE /projects/:projectId
 * Delete a project
 */
router.delete('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await deleteProject(req.user.id, projectId);
    
    if (!result) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json({ message: 'Project deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    logger.error('[/projects/:projectId] Error deleting project', error);
    res.status(500).send('Error deleting project');
  }
});

module.exports = router;
