fx_version 'cerulean'
version '1.1.3'
description 'Prism Banking'
author 'im_hydra#0'
game 'gta5'

ui_page 'web/build/index.html'

files {
    'data/*.json',
    'web/build/index.html',
    'web/build/**/*.*',
}

shared_scripts {
    '@ox_lib/init.lua',
    'shared/*.lua'
}

client_scripts {
    'client/*.lua'
}

server_scripts {
    'server/sv_customize.lua',
    'server/*.lua'
}

escrow_ignore {
    'shared/*.lua',
    'client/cl_customize.lua',
    'server/sv_customize.lua',
    'server/sv_webhooks.lua'
}

lua54 'yes'
