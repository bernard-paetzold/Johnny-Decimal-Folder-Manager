import { rename } from "fs";
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder } from "obsidian";


export default class MyPlugin extends Plugin 
{
	async onload() 
	{
		console.log("Initialising johnny decimal manager")
		let folders: TAbstractFile[] = []

		this.addCommand(
		{
			id: "refresh-johnny-decimal-index",
			name: "Refresh index",
			callback: () =>
			{
				console.log("Refactoring indices")
				var folders = getFolders()
				renameFiles(folders)
			}
		});
	}

	onunload() 
	{
		console.log("Unloading johnny decimal manager")
	}
}

function getFolders(): TAbstractFile[]
{
	this.app.fileManager
	var folders: TAbstractFile[] = []
	const files = this.app.vault.getAllLoadedFiles();
	//Remove non-folders and redundant folders
	for (let i = 0; i < files.length; i++)
	{
		if (files[i] instanceof TFolder && files[i].path != "/") 
		{
			//Exclude all folders beyond depth 2
			const depth = 2
			var splitted = files[i].path.split("/")

			if (splitted.length <= 2)
			{
				var found = false;
				var count = 0;
				//Check for redundancy
				while (count < folders.length && found == false)
				{
					if (files[i].path == folders[count].path)
					{
						found = true
					}
					count++
				}
				if (!found)
				{
					folders[folders.length] = files[i]
				}					
			}				
		}
	}
	return folders
}

function getSortedFolders(): TAbstractFile[][]
{
	var sortedFolders: TAbstractFile[][] = []
	let childFolders: TAbstractFile[] = []
	let parentFolders: TAbstractFile[] = []
	let allFolders = getFolders()

	//Split into parent and child folders
	for (let i = 0; i < allFolders.length; i++)
	{
		var splitPath = allFolders[i].path.split("/", 3)
		if (splitPath.length == 1)
		{
			parentFolders[parentFolders.length] = allFolders[i]
		}
		else if (splitPath.length == 2)
		{
			childFolders[childFolders.length] = allFolders[i]			
		}
	}
	sortedFolders[0] = parentFolders
	sortedFolders[1] = childFolders
	return sortedFolders
}

function renameFiles(allFolders: TAbstractFile[])
{
	let childFolders: TAbstractFile[] = []
	let parentFolders: TAbstractFile[] = []
	//Split into parent and child folders
	var sortedFolders = getSortedFolders()
	parentFolders = sortedFolders[0]
	childFolders = sortedFolders[1]

	//Go folder by folder and get all child folders
	for (let i = 0; i < parentFolders.length; i++)
	{
		let currentChildren: TAbstractFile[] = []
		let currentParentIndex: string
		var splitPath: string[] = [""]
		//Get current parent index
		if (parentFolders[i].path.contains("-"))
			splitPath = parentFolders[i].path.split("-", 2)
		currentParentIndex = splitPath[0]
		for (let l = 0; l < childFolders.length; l++)
		{
			//Get all children of current parent folder
			if (childFolders[l].path.includes(parentFolders[i].path))
			{
				currentChildren[currentChildren.length] = childFolders[l]
			}
		}
		//Loop through all children
		for (let l = 0; l < currentChildren.length; l++)
		{
			//Check if an index already exists
			if (currentChildren[l].name.contains(".") && currentChildren[l].name.contains("-"))
			{
				var rename = false
				//All the children need this added to their name, then numbered from there
				//Check first part e.g. "07" of "07.01-Folder-Name"
				var splitted = currentChildren[l].name.split(".", 2)
				var parentIndex = splitted[0]

				if (parentIndex != currentParentIndex)
				{
					//File has to be renamed
					rename = true
				}

				//check child folder index
				var childAndFolderName = splitted[1].split("-", 2)
				var childIndex = childAndFolderName[0]

				if (childIndex.length != 2)
				{
					childIndex = (currentChildren.length - 1).toString()

					//Add zero in front of number
					if (childIndex.length < 2)
					{
						childIndex = '0' + childIndex
					}
					rename = true
				}		
				
				//Get folder name
				var folderName = childAndFolderName[1]

				//If the folder is invalid, rename
				if (rename == true)
				{
					console.log(currentChildren[l].name+ " -> " + currentParentIndex + "." + childIndex + "-" + currentChildren[l].name)
					this.app.fileManager.renameFile(currentChildren[l], (parentFolders[i].path + "/" + currentParentIndex + "." + childIndex + "-" + folderName))
				}
			}
			else
			{
				//No existing index
				//Generate index
				var childIndex = (currentChildren.length).toString()

				//Add zero in front of number
				if (childIndex.length < 2)
				{
					childIndex = '0' + childIndex
				}
				console.log(currentChildren[l].name+ " -> " + currentParentIndex + "." + childIndex + "-" + currentChildren[l].name)
				this.app.fileManager.renameFile(currentChildren[l], (parentFolders[i].path + "/" + currentParentIndex + "." + childIndex + "-" + currentChildren[l].name))
			}
		}	
	}
	removeDuplicateIndex()
}

function removeDuplicateIndex()
{
	var sortedFolders = getSortedFolders()
	var parentFolders = sortedFolders[0]
	var childFolders = sortedFolders[1]


	for (let i = 0; i < parentFolders.length; i++)
	{
		let currentChildren: TAbstractFile[] = []
		let childrenNames: string[] = [];
		for (let l = 0; l < childFolders.length; l++)
		{
			//Get all children of current parent folder
			if (childFolders[l].path.includes(parentFolders[i].path))
			{
				currentChildren[currentChildren.length] = childFolders[l]
				childrenNames[childrenNames.length] = childFolders[l].name
			}
		}

		//Rename
		//Loop through all children
		for (let l = 0; l < childrenNames.length; l++)
		{
			if (childrenNames[l].contains("-") && childrenNames[l].contains("."))
			{
				var childIndexAndName = childrenNames[l].split(".", 2)
				var childIndex = childIndexAndName[1].split("-", 1)[0]

				//Check against others to see if there is a duplicate
				var x = l + 1
				while (x < childrenNames.length && duplicatesExists(childrenNames))
				{
					if (childrenNames[x].contains("-") && childrenNames[x].contains("."))
					{
						var currChildIndexAndName = childrenNames[x].split(".", 2)
						var currChildIndex = currChildIndexAndName[1].split("-", 1)[0]
						if (childIndex == currChildIndex)
						{
							//Get current index
							var numIndex:	number
							if (currChildIndex[0] == '0')
							{
								numIndex = Number.parseInt(currChildIndex[1])
							}
							else
							{
								numIndex = Number.parseInt(currChildIndex)
							}

							var newChildIndex = (numIndex + 1).toString()
							if (newChildIndex.length < 2)
							{
								newChildIndex = '0' + newChildIndex
							}

							var folderName = childrenNames[x].replace(childrenNames[x].split("-", 2)[0], "")
							var newFolder = childrenNames[x].split(".", 2)[0] + "." + newChildIndex + folderName	
							//Rename folder
							childrenNames[x] = newFolder		
							
							//Update array sorting
							var min: number
							for (let l = 0; l < childrenNames.length - 1; l++)
							{
								min = l
								for (let x = l + 1; x < childrenNames.length; x++)
								{
									if (childrenNames[x].split(".", 2)[1].split("-")[0] < childrenNames[min].split(".", 2)[1].split("-")[0])
									{
										min = x
									}

									var temp = childrenNames[min]
									childrenNames[min] = childrenNames[l]
									childrenNames[l] = temp

									var tempFolder = currentChildren[min]
									currentChildren[min] = currentChildren[l]
									currentChildren[l] = tempFolder
								}
							}
						}
					}
					x++
				}
			}
		}	
		//Apply
		for (let l = 0; l < childrenNames.length; l++)
		{
			if (currentChildren[l].name != childrenNames[l])
			{
				console.log(currentChildren[l].name + " -> " + childrenNames[l])
				this.app.fileManager.renameFile(currentChildren[l], parentFolders[i].path + "/" + childrenNames[l]);
			}
		}
	}

}
function duplicatesExists(names: string[]): boolean
{
	var duplicateExists = false

	for (let i = 0; i < names.length; i++)
	{
		let x = i + 1
		while (x < names.length && !duplicateExists)
		{
			if (names[i].contains("-") && names[i].contains(".") && names[x].contains("-") && names[x].contains("."))
			{
				if (names[i].split(".", 2)[1].split("-", 1)[0] == names[x].split(".", 2)[1].split("-", 1)[0])
				{
					duplicateExists = true
				}
			}
			x++
		}
	}
	return duplicateExists
}