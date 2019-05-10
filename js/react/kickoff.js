let renderLevel = function( visualRefreshOnly )
{
    let width = document.getElementById( "input_width" ).value;
    let height = document.getElementById( "input_height" ).value;
    let pathLength = document.getElementById( "input_path_length" ).value;
    let offshootCount = document.getElementById( "input_offshoot_count" ).value;
    let areaCount = document.getElementById( "input_area_count" ).value;
    let connectOffshoots = document.getElementById( "input_connect_offshoots" ).checked;
    let offshootDelay = document.getElementById( "input_offshoot_delay" ).value;
    let usesEmoji = document.getElementById( "input_use_emoji" ).checked;
    let showPath = document.getElementById( "input_show_path" ).checked;
    let showsCost = document.getElementById( "input_show_cost" ).checked;
    
    let levelContainer = document.getElementById( "level_container" );
    
    let level = ReactDOM.render( <Level width={width} height={height} pathLength={pathLength} offshootCount={offshootCount} usesEmoji={usesEmoji} showPath={showPath} showsCost={showsCost} areaCount={areaCount}/>, levelContainer );
    
    if ( !visualRefreshOnly )
    {
        //we have a delay, so we need to set up a loop to continue generating
        if ( offshootDelay > 0 )
        {
            offshootCount = 1;
            level.offshootsGeneratedCount = 0;
            level.offshootGenerationId = ( level.offshootGenerationId || 0 ) + 1;
            setTimeout( () => addOffshoot( level, level.offshootGenerationId ), offshootDelay );
        }
        
        //TODO - the delay thing won't work with the areas... maybe abstract that out so I can use it everywhere
        
        level.setState( { data:LevelGenerator.createLevel( width, height, pathLength, offshootCount, areaCount, connectOffshoots ) } );
    }
};

let addOffshoot = function( level, genId )
{
    //this is in case the user starts generating a new one while already generating another one
    if ( genId !== level.offshootGenerationId )
    {
        return;
    }
    
    let offshootCount = document.getElementById( "input_offshoot_count" ).value;
    let connectOffshoots = document.getElementById( "input_connect_offshoots" ).checked;
    let offshootDelay = document.getElementById( "input_offshoot_delay" ).value;
    
    let generatedCount = 1;
    let newData = level.state.data.copy();
    LevelGenerator.createOffshoots( newData, generatedCount, connectOffshoots );
    level.offshootsGeneratedCount = ( level.offshootsGeneratedCount || 0 ) + generatedCount;
    level.setState( {data:newData} );
        
    if ( level.offshootsGeneratedCount < offshootCount )
    {
        setTimeout( () => addOffshoot( level, genId ), offshootDelay );
    }
};