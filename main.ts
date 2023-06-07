import { rename } from "fs";
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder } from "obsidian";


export default class MyPlugin extends Plugin 
{
	async onload() 
	{
		console.log("Initialising johnny decimal manager")
		let folders: TAbstractFile[] = []

		app.vault.on("rename", function(file, oldname) {})
		//this.registerEvent(this.app.vault.on('create', () => 
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


	//Go folder by folder and get all child folders
	for (let i = 0; i < parentFolders.length; i++)
	{
		let currentChildren: TAbstractFile[] = []
		for (let l = 0; l < childFolders.length; l++)
		{
			//Get all children of current parent folder
			if (childFolders[l].path.includes(parentFolders[i].path))
			{
				currentChildren[currentChildren.length] = childFolders[l]
			}
		}
		var min: number
		for (let l = 0; l < currentChildren.length - 1; l++)
		{
			min = l
			for (let x = l + 1; x < currentChildren.length; x++)
			{
				if (currentChildren[x].name < currentChildren[min].name)
				{
					min = x
				}

				var temp = currentChildren[min]
				currentChildren[min] = currentChildren[l]
				currentChildren[l] = temp
			}
		}
		//Loop through all children
		for (let l = 0; l < currentChildren.length; l++)
		{

			var childIndexAndName = currentChildren[l].name.split(".", 2)
			var childIndex = childIndexAndName[1].split("-", 1)[0]

			//Check against others to see if there is a duplicate
			var x = l + 1
			var duplicateFound = false
			while (x < currentChildren.length && duplicateFound == false)
			{
				var currChildIndexAndName = currentChildren[x].name.split(".", 2)
				var currChildIndex = currChildIndexAndName[1].split("-", 1)[0]
				console.log(currentChildren[l].name + ", " + currentChildren[x].path)
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

					var folderName = currentChildren[x].name.replace(currentChildren[x].name.split("-", 2)[0], "")
					var newFolder = currentChildren[x].name.split(".", 2)[0] + "." + newChildIndex + folderName	
					console.log(currentChildren[x].name)		
					this.app.fileManager.renameFile(currentChildren[x], (parentFolders[i].path + "/" + newFolder))
					console.log(currentChildren[x].name)
					console.log(currentChildren[x])
					duplicateFound = true								
				}
				x++
			}

			if (duplicateFound)
			{
				removeDuplicateIndex()
			}
		}		
	}
}
/*function removeDuplicateIndex()
{
	var sortedFolders = getSortedFolders()
	var parentFolders = sortedFolders[0]
	var childFolders = sortedFolders[1]


	//Go folder by folder and get all child folders
	for (let i = 0; i < parentFolders.length; i++)
	{
		let currentChildren: TAbstractFile[] = []
		for (let l = 0; l < childFolders.length; l++)
		{
			//Get all children of current parent folder
			if (childFolders[l].path.includes(parentFolders[i].path))
			{
				currentChildren[currentChildren.length] = childFolders[l]
			}
		}
		var min: number
		for (let l = 0; l < currentChildren.length - 1; l++)
		{
			min = l
			for (let x = l + 1; x < currentChildren.length; x++)
			{
				if (currentChildren[x].name < currentChildren[min].name)
				{
					min = x
				}

				var temp = currentChildren[min]
				currentChildren[min] = currentChildren[l]
				currentChildren[l] = temp
			}
		}
		//Loop through all children
		for (let l = 0; l < currentChildren.length; l++)
		{

			var childIndexAndName = currentChildren[l].name.split(".", 2)
			var childIndex = childIndexAndName[1].split("-", 1)[0]

			//Check against others to see if there is a duplicate
			var x = l + 1
			while (x < currentChildren.length)
			{
				var currChildIndexAndName = currentChildren[x].name.split(".", 2)
				var currChildIndex = currChildIndexAndName[1].split("-", 1)[0]
				//console.log(currentChildren[l].name + ", " + currentChildren[x].path)
				if (childIndex == currChildIndex)
				{
					//console.log( l + ". " + currentChildren[l].path + " = " +  x + ". " + currentChildren[x].path)
					
					//Redundant index, rename all following indices
					var y = x
					var gapFound = false;
					while (y < currentChildren.length && gapFound == false)
					{
						currChildIndexAndName = currentChildren[y].name.split(".", 2)
						currChildIndex = currChildIndexAndName[1].split("-", 1)[0]
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

						var folderName = currentChildren[y].name.replace(currentChildren[y].name.split("-", 2)[0], "")
						var newFolder = currentChildren[y].name.split(".", 2)[0] + "." + newChildIndex + folderName	
						//console.log(currentChildren[y].name + " -> " + newFolder)			
						this.app.fileManager.renameFile(currentChildren[y], (parentFolders[i].path + "/" + newFolder))
						//this.app.vault.rename(currentChildren[y], (parentFolders[i].path + "/" + newFolder))
						console.log(duplicatesExists(parentFolders[i].name))
						if (!duplicatesExists(parentFolders[i].name))
						{
							gapFound = true
							console.log("Stop at: " + (y + 1))
						}
						y++
					}
				}
				x++
			}
		}		
	}
			
}*/

function duplicatesExists(parentFolderName: string): boolean
{
	var sortedFolders = getSortedFolders()
	var parentFolders = sortedFolders[0]
	var childFolders = sortedFolders[1]
	var duplicateExists = false

	for (let i = 0; i < parentFolders.length; i++)
	{
		let currentChildren: TAbstractFile[] = []
		for (let l = 0; l < childFolders.length; l++)
		{
			//Get all children of current parent folder
			if (childFolders[l].path.includes(parentFolders[i].path))
			{
				currentChildren[currentChildren.length] = childFolders[l]
			}
		}
		for (let i = 0; i < currentChildren.length; i++)
		{
			var currIndex = currentChildren[i].name.split("-", 1)[0];

			for (let x = i + 1; x < currentChildren.length; x++)
			{
				if (currIndex == currentChildren[x].name.split("-", 1)[0])
				{
					duplicateExists =  true
					console.log(currentChildren[i].name + " = " + currentChildren[x].name)
				}
			}
		}
	}
	return duplicateExists
}

