# Installation

TreeK is installed as a Joomla package.

## Requirements

TreeK has been tested and works on Joomla 6.0.x or 6.1.x and Kunena Forum 7.0.4
and 7.0.5. Installing TreeK on other builds likely works, but it is not
officially announced, as extensive testing has not been performed on them. If
necessary, please contact the developer via the website:

https://treek.support

## Install TreeK Free

1. Download the latest TreeK Free package from GitHub Releases.
2. In Joomla Administrator, open **System -> Install -> Extensions**.
3. Upload and install the TreeK package ZIP.
4. In **Extensions: Manage**, enable the **Treek - Add-on for Kunena Forum** plugin.
5. Open **Kunena -> Templates** and activate the TreeK template.

## After Installation

In Kunena's **Recent Topics** tab, the **Replies** number for topics with responses is clickable and highlighted in color. Clicking this number opens the topic's post tree.

If you have already entered a topic, you can access the post tree by clicking the tree icon located in the header of each post.

Use the settings button in the tree window to adjust the visible tree.

## Updating

Install the new package over the old one using Joomla extension installer. User
settings are preserved.

Normally, TreeK does not need to be uninstalled before updating. Uninstalling is
only needed when you want to remove TreeK completely, reset its extension state,
or restore Kunena files from a backup.

## Troubleshooting

If the tree does not open:

- confirm that the TreeK AJAX plugin is enabled;
- confirm that Kunena is installed and working;
- clear Joomla and browser cache;
- check whether the current Kunena template is TreeK.



