const { GLOBAL_PROJECT_NAME } = require('librechat-data-provider').Constants;
const { Project } = require('~/db/models');
const { logger } = require('@librechat/data-schemas');

/**
 * Retrieve a project by ID and convert the found project document to a plain object.
 *
 * @param {string} projectId - The ID of the project to find and return as a plain object.
 * @param {string|string[]} [fieldsToSelect] - The fields to include or exclude in the returned document.
 * @returns {Promise<IMongoProject>} A plain object representing the project document, or `null` if no project is found.
 */
const getProjectById = async function (projectId, fieldsToSelect = null) {
  const query = Project.findById(projectId);

  if (fieldsToSelect) {
    query.select(fieldsToSelect);
  }

  return await query.lean();
};

/**
 * Retrieve a project by name and convert the found project document to a plain object.
 * If the project with the given name doesn't exist and the name is "instance", create it and return the lean version.
 *
 * @param {string} projectName - The name of the project to find or create.
 * @param {string|string[]} [fieldsToSelect] - The fields to include or exclude in the returned document.
 * @returns {Promise<IMongoProject>} A plain object representing the project document.
 */
const getProjectByName = async function (projectName, fieldsToSelect = null) {
  const query = { name: projectName };
  const update = { $setOnInsert: { name: projectName } };
  const options = {
    new: true,
    upsert: projectName === GLOBAL_PROJECT_NAME,
    lean: true,
    select: fieldsToSelect,
  };

  return await Project.findOneAndUpdate(query, update, options);
};

/**
 * Add an array of prompt group IDs to a project's promptGroupIds array, ensuring uniqueness.
 *
 * @param {string} projectId - The ID of the project to update.
 * @param {string[]} promptGroupIds - The array of prompt group IDs to add to the project.
 * @returns {Promise<IMongoProject>} The updated project document.
 */
const addGroupIdsToProject = async function (projectId, promptGroupIds) {
  return await Project.findByIdAndUpdate(
    projectId,
    { $addToSet: { promptGroupIds: { $each: promptGroupIds } } },
    { new: true },
  );
};

/**
 * Remove an array of prompt group IDs from a project's promptGroupIds array.
 *
 * @param {string} projectId - The ID of the project to update.
 * @param {string[]} promptGroupIds - The array of prompt group IDs to remove from the project.
 * @returns {Promise<IMongoProject>} The updated project document.
 */
const removeGroupIdsFromProject = async function (projectId, promptGroupIds) {
  return await Project.findByIdAndUpdate(
    projectId,
    { $pull: { promptGroupIds: { $in: promptGroupIds } } },
    { new: true },
  );
};

/**
 * Remove a prompt group ID from all projects.
 *
 * @param {string} promptGroupId - The ID of the prompt group to remove from projects.
 * @returns {Promise<void>}
 */
const removeGroupFromAllProjects = async (promptGroupId) => {
  await Project.updateMany({}, { $pull: { promptGroupIds: promptGroupId } });
};

/**
 * Add an array of agent IDs to a project's agentIds array, ensuring uniqueness.
 *
 * @param {string} projectId - The ID of the project to update.
 * @param {string[]} agentIds - The array of agent IDs to add to the project.
 * @returns {Promise<IMongoProject>} The updated project document.
 */
const addAgentIdsToProject = async function (projectId, agentIds) {
  return await Project.findByIdAndUpdate(
    projectId,
    { $addToSet: { agentIds: { $each: agentIds } } },
    { new: true },
  );
};

/**
 * Remove an array of agent IDs from a project's agentIds array.
 *
 * @param {string} projectId - The ID of the project to update.
 * @param {string[]} agentIds - The array of agent IDs to remove from the project.
 * @returns {Promise<IMongoProject>} The updated project document.
 */
const removeAgentIdsFromProject = async function (projectId, agentIds) {
  return await Project.findByIdAndUpdate(
    projectId,
    { $pull: { agentIds: { $in: agentIds } } },
    { new: true },
  );
};

/**
 * Remove an agent ID from all projects.
 *
 * @param {string} agentId - The ID of the agent to remove from projects.
 * @returns {Promise<void>}
 */
const removeAgentFromAllProjects = async (agentId) => {
  await Project.updateMany({}, { $pull: { agentIds: agentId } });
};

/**
 * Get all user-scoped projects for a user
 * @param {string} userId - The user ID
 * @returns {Promise<IMongoProject[]>} Array of projects
 */
const getProjects = async (userId) => {
  try {
    const projects = await Project.find({ user: userId }).lean().sort({ updatedAt: -1 });
    return projects;
  } catch (error) {
    logger.error('[getProjects] Error getting projects', error);
    throw new Error('Error retrieving projects');
  }
};

/**
 * Get a single user-scoped project by ID
 * @param {string} userId - The user ID
 * @param {string} projectId - The project ID
 * @returns {Promise<IMongoProject|null>} The project or null if not found
 */
const getProject = async (userId, projectId) => {
  try {
    const project = await Project.findOne({ _id: projectId, user: userId }).lean();
    return project;
  } catch (error) {
    logger.error('[getProject] Error getting project', error);
    throw new Error('Error retrieving project');
  }
};

/**
 * Save or update a user-scoped project
 * @param {string} userId - The user ID
 * @param {Object} projectData - The project data to save
 * @returns {Promise<IMongoProject>} The saved project
 */
const saveProject = async (userId, projectData) => {
  try {
    const { _id, name, systemPrompt, defaultPresetId, ragFileIds } = projectData;
    
    const update = {
      user: userId,
      name,
      systemPrompt: systemPrompt ?? null,
      defaultPresetId: defaultPresetId ?? null,
      ragFileIds: Array.isArray(ragFileIds) ? ragFileIds : [],
    };

    if (_id) {
      // Update existing project
      const project = await Project.findOneAndUpdate(
        { _id, user: userId },
        { $set: update },
        { new: true, lean: true }
      );
      return project;
    } else {
      // Create new project
      const project = await Project.create(update);
      return project.toObject();
    }
  } catch (error) {
    logger.error('[saveProject] Error saving project', error);
    throw error;
  }
};

/**
 * Update project name (rename)
 * @param {string} userId - The user ID
 * @param {string} projectId - The project ID
 * @param {string} newName - The new project name
 * @returns {Promise<IMongoProject|null>} The updated project or null if not found
 */
const updateProjectName = async (userId, projectId, newName) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: projectId, user: userId },
      { $set: { name: newName } },
      { new: true, lean: true }
    );
    return project;
  } catch (error) {
    logger.error('[updateProjectName] Error updating project name', error);
    throw error;
  }
};

/**
 * Delete a user-scoped project
 * @param {string} userId - The user ID
 * @param {string} projectId - The project ID
 * @returns {Promise<Object|null>} The delete result or null if not found
 */
const deleteProject = async (userId, projectId) => {
  try {
    const result = await Project.deleteOne({ _id: projectId, user: userId });
    if (result.deletedCount === 0) {
      return null;
    }
    return result;
  } catch (error) {
    logger.error('[deleteProject] Error deleting project', error);
    throw new Error('Error deleting project');
  }
};

module.exports = {
  getProjectById,
  getProjectByName,
  /* prompts */
  addGroupIdsToProject,
  removeGroupIdsFromProject,
  removeGroupFromAllProjects,
  /* agents */
  addAgentIdsToProject,
  removeAgentIdsFromProject,
  removeAgentFromAllProjects,
  /* user-scoped projects */
  getProjects,
  getProject,
  saveProject,
  updateProjectName,
  deleteProject,
};
