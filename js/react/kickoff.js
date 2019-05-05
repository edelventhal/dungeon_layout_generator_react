//let level = null;

let renderLevel = function()
{
    let width = document.getElementById( "input_width" ).value;
    let height = document.getElementById( "input_height" ).value;
    let pathLength = document.getElementById( "input_path_length" ).value;
    let offshootCount = document.getElementById( "input_offshoot_count" ).value;
    let usesEmoji = document.getElementById( "input_use_emoji" ).checked;
    let showPath = document.getElementById( "input_show_path" ).checked;
    
    let levelContainer = document.getElementById( "level_container" );
    
    let level = ReactDOM.render( <Level width={width} height={height} pathLength={pathLength} offshootCount={offshootCount} usesEmoji={usesEmoji} showPath={showPath}/>, levelContainer );
    level.setState( { data:LevelGenerator.createLevel( width, height, pathLength, offshootCount, true ) } );
}